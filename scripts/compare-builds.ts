// Proves that a change doesn't change the site: compares two versions page by page in Chromium.
//   npm run compare -- <baseline> [candidate]
// Each version is a URL (a deploy) or a build folder; the candidate defaults to dist/. Example,
// after `npm run build`: npm run compare -- https://personal-website.lucien-hilversum.workers.dev
//
// For every page in the baseline's sitemap, plus the 404 page, it compares:
// - the HTML (reported, but not a failure on its own: the same page can be written differently),
// - the computed styles of every element (and ::before/::after) at rest, and around every link
//   and button while hovered and while focused,
// - which image file each <img> shows (the one its srcset picked),
// - a full-page screenshot with the images masked (pixels off by 1 or 2 out of 255 are
//   anti-aliasing noise and don't count; differing pairs go to test-results/compare/),
// on a desktop, tablet and phone, each in the light and the dark theme. It exits with 1 when any
// of these differ, except the HTML. At the end it notes image files whose bytes differ: the same
// image and settings give different AVIF bytes on different machines, so that's expected when
// comparing a local build with a deploy.
import { chromium, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const outDir = path.join('test-results', 'compare');
const missingPage = '/this-page-does-not-exist/';

const viewports: Record<string, BrowserContextOptions> = {
  desktop: { viewport: { width: 1280, height: 900 } },
  tablet: { viewport: { width: 800, height: 1000 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

/** Serves a build folder like Cloudflare does: /about/ → about/index.html, else 404.html. */
async function serve(dir: string): Promise<{ url: string; server: Server }> {
  const find = async (urlPath: string) => {
    const base = path.join(dir, decodeURIComponent(urlPath));
    for (const candidate of [base, path.join(base, 'index.html'), `${base}.html`]) {
      if (
        await stat(candidate).then(
          (s) => s.isFile(),
          () => false,
        )
      )
        return candidate;
    }
    return undefined;
  };
  const server = createServer(async (request, response) => {
    const file = await find(new URL(request.url ?? '/', 'http://localhost').pathname);
    const target = file ?? path.join(dir, '404.html');
    response.writeHead(file ? 200 : 404, {
      'content-type': contentTypes[path.extname(target)] ?? 'application/octet-stream',
    });
    response.end(await readFile(target));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return { url: `http://localhost:${(server.address() as AddressInfo).port}`, server };
}

/** A URL stays as it is; a folder gets served. */
async function open(version: string) {
  if (/^https?:\/\//.test(version)) return { url: version.replace(/\/$/, ''), server: undefined };
  if (!(await stat(path.join(version, 'index.html')).catch(() => undefined))) {
    throw new Error(`${version} is neither a URL nor a build folder (no index.html in it).`);
  }
  return serve(version);
}

/** In the page: computed styles per element, keyed by its position in <body>. */
function stylesIn(onlyAroundTarget: boolean): Record<string, string> {
  // <head> isn't drawn and may differ in how many <style> tags it has.
  const all = [document.documentElement, document.body, ...document.body.querySelectorAll('*')];
  const indexOf = new Map(all.map((element, index) => [element, index]));
  let elements = all;
  if (onlyAroundTarget) {
    const target = document.querySelector('[data-compare-target]')!;
    elements = [];
    for (let element: Element | null = target; element; element = element.parentElement) {
      elements.push(element);
    }
    elements.push(...target.querySelectorAll('*'));
  }
  const styles: Record<string, string> = {};
  for (const element of elements) {
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(element, pseudo);
      if (pseudo && (style.content === 'none' || style.content === 'normal')) continue;
      let text = '';
      for (const property of style) text += `${property}:${style.getPropertyValue(property)};`;
      styles[`${indexOf.get(element)}:${element.tagName.toLowerCase()}${pseudo ?? ''}`] = text;
    }
  }
  return styles;
}

/** The elements whose styles differ, with up to 6 of the differing properties each. */
function styleDifferences(a: Record<string, string>, b: Record<string, string>): string[] {
  const parse = (text = '') =>
    new Map(text.split(';').map((pair) => pair.split(/:(.*)/s) as [string, string]));
  const differences: string[] = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[key] === b[key]) continue;
    const pa = parse(a[key]);
    const pb = parse(b[key]);
    // Chrome lists custom properties in no fixed order, so only the values count.
    const changed = [...new Set([...pa.keys(), ...pb.keys()])].filter(
      (p) => pa.get(p) !== pb.get(p),
    );
    if (changed.length === 0) continue;
    const shown = changed.slice(0, 6).map((p) => `${p} ${pa.get(p)} → ${pb.get(p)}`);
    differences.push(`${key}: ${shown.join(', ')}${changed.length > 6 ? ', …' : ''}`);
  }
  return differences;
}

interface Snapshot {
  rest: Record<string, string>;
  states: Record<string, Record<string, string>>;
  /** The file each <img> shows (the one its srcset picked), by path. */
  images: string[];
  screenshot: Buffer;
}

async function snapshot(page: Page, url: string): Promise<Snapshot> {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Load every lazy image and wait until it's decoded, so a screenshot never catches one halfway.
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map(async (image) => {
        image.loading = 'eager';
        await image.decode().catch(() => {});
      }),
    ),
  );
  await page.waitForTimeout(150);
  const rest = await page.evaluate(stylesIn, false);
  const images = await page.evaluate(() =>
    [...document.images].map((image) =>
      image.currentSrc ? new URL(image.currentSrc).pathname : '',
    ),
  );
  // Images are left out of the screenshot: two builds of the same code can have different image
  // bytes (the AVIF encoder's output differs per platform). Which file each image shows is
  // compared instead, and the files themselves separately. Transparent while the screenshot is
  // taken, so a blurred backdrop (the nav island's) doesn't show them either; their boxes stay.
  const hideImages = await page.addStyleTag({ content: 'img { opacity: 0 !important; }' });
  const screenshot = await page.screenshot({
    fullPage: true,
    animations: 'disabled',
    mask: [page.locator('img')],
    maskColor: '#ff00ff',
  });
  await hideImages.evaluate((style) => (style as Element).remove());
  const result: Snapshot = { rest, states: {}, images, screenshot };
  const targets = page.locator('a, button');
  for (let i = 0; i < (await targets.count()); i++) {
    const target = targets.nth(i);
    if (!(await target.isVisible())) continue;
    await target.evaluate((element) => element.setAttribute('data-compare-target', ''));
    // Off-screen elements (the skip link until it's focused) can't be hovered.
    if (
      await target.hover({ force: true, timeout: 2000 }).then(
        () => true,
        () => false,
      )
    ) {
      result.states[`hover ${i}`] = await page.evaluate(stylesIn, true);
    }
    await target.focus();
    result.states[`focus ${i}`] = await page.evaluate(stylesIn, true);
    await target.evaluate((element) => {
      element.removeAttribute('data-compare-target');
      (element as HTMLElement).blur();
    });
    await page.mouse.move(0, 0);
  }
  return result;
}

// Screenshot pixels off by this much or less (out of 255) are anti-aliasing noise, such as the
// edge of a rounded corner, and don't count. Colors are compared exactly through the styles.
const tolerance = 2;

/** How two PNG screenshots differ, worked out in the browser (it can decode PNG). */
async function pixelDifference(browser: Browser, a: Buffer, b: Buffer) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ([a, b, tolerance]) => {
        const load = async (base64: string) =>
          createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
        const [imageA, imageB] = await Promise.all([load(a), load(b)]);
        const { width, height } = imageA;
        if (width !== imageB.width || height !== imageB.height) {
          return { sizeDiffers: true, pixels: 0, overTolerance: 0 };
        }
        const context = new OffscreenCanvas(width, height).getContext('2d')!;
        const pixelsOf = (image: ImageBitmap) => {
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        };
        const [pa, pb] = [pixelsOf(imageA), pixelsOf(imageB)];
        let pixels = 0;
        let overTolerance = 0;
        for (let i = 0; i < pa.length; i += 4) {
          const delta = Math.max(
            Math.abs(pa[i]! - pb[i]!),
            Math.abs(pa[i + 1]! - pb[i + 1]!),
            Math.abs(pa[i + 2]! - pb[i + 2]!),
            Math.abs(pa[i + 3]! - pb[i + 3]!),
          );
          if (delta > 0) pixels++;
          if (delta > tolerance) overTolerance++;
        }
        return { sizeDiffers: false, pixels, overTolerance };
      },
      [a.toString('base64'), b.toString('base64'), tolerance] as const,
    );
  } finally {
    await page.close();
  }
}

/**
 * One page view in a fresh browser context: Chrome reuses a larger srcset image it already has
 * in its cache, so pages visited before would change what's drawn.
 */
async function freshSnapshot(browser: Browser, options: BrowserContextOptions, url: string) {
  // Reduced motion, so hover transitions don't leave a style halfway when it's read.
  const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
  try {
    return await snapshot(await context.newPage(), url);
  } finally {
    await context.close();
  }
}

async function main() {
  const [baselineArg, candidateArg = 'dist'] = process.argv.slice(2);
  if (!baselineArg) {
    console.error('Usage: npm run compare -- <baseline URL or folder> [candidate URL or folder]');
    process.exit(2);
  }
  const baseline = await open(baselineArg);
  const candidate = await open(candidateArg);
  const browser = await chromium.launch();
  await mkdir(outDir, { recursive: true });
  try {
    const sitemap = await (await fetch(`${baseline.url}/sitemap-0.xml`)).text();
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    paths.push(missingPage);
    console.log(`Comparing ${candidateArg} with ${baselineArg}: ${paths.length} pages.\n`);

    const htmlDifferent: string[] = [];
    for (const pagePath of paths) {
      const [a, b] = await Promise.all(
        [baseline, candidate].map((version) => fetch(version.url + pagePath).then((r) => r.text())),
      );
      if (a !== b) htmlDifferent.push(pagePath);
    }
    console.log(
      `HTML: ${paths.length - htmlDifferent.length} pages identical` +
        (htmlDifferent.length ? `, different: ${htmlDifferent.join(', ')}` : '') +
        '\n',
    );

    let views = 0;
    let failures = 0;
    const imagePaths = new Set<string>();
    for (const [viewportName, options] of Object.entries(viewports)) {
      for (const colorScheme of ['light', 'dark'] as const) {
        for (const pagePath of paths) {
          const label = `${viewportName} ${colorScheme} ${pagePath}`;
          const viewOptions = { ...options, colorScheme };
          const a = await freshSnapshot(browser, viewOptions, baseline.url + pagePath);
          const b = await freshSnapshot(browser, viewOptions, candidate.url + pagePath);
          const issues: string[] = [];
          const rest = styleDifferences(a.rest, b.rest);
          if (rest.length)
            issues.push(`styles: ${rest.length} elements differ`, ...rest.slice(0, 5));
          for (const state of new Set([...Object.keys(a.states), ...Object.keys(b.states)])) {
            const differences = styleDifferences(a.states[state] ?? {}, b.states[state] ?? {});
            if (differences.length)
              issues.push(
                `${state}: ${differences.length} elements differ`,
                ...differences.slice(0, 3),
              );
          }
          for (const image of [...a.images, ...b.images]) if (image) imagePaths.add(image);
          if (a.images.join() !== b.images.join()) {
            issues.push(`images show other files: ${a.images.join(', ')} → ${b.images.join(', ')}`);
          }
          let noise = '';
          if (!a.screenshot.equals(b.screenshot)) {
            const difference = await pixelDifference(browser, a.screenshot, b.screenshot);
            if (difference.sizeDiffers || difference.overTolerance > 0) {
              const name = label.replace(/[^a-z0-9]+/gi, '_');
              await writeFile(path.join(outDir, `${name}_baseline.png`), a.screenshot);
              await writeFile(path.join(outDir, `${name}_candidate.png`), b.screenshot);
              const what = difference.sizeDiffers
                ? 'has another size'
                : `differs in ${difference.overTolerance} pixels`;
              issues.push(`screenshot ${what} (saved as ${outDir}/${name}_*.png)`);
            } else {
              noise = `; ${difference.pixels} pixels off by at most ${tolerance}, not counted`;
            }
          }
          views++;
          if (issues.length) {
            failures++;
            console.log(`DIFFERENT ${label}\n  ${issues.join('\n  ')}`);
          } else {
            const states = Object.keys(a.states).length;
            console.log(
              `same      ${label} (${Object.keys(a.rest).length} elements, ${states} hover/focus states${noise})`,
            );
          }
        }
      }
    }
    console.log(
      `\n${views} page views compared: ${failures ? `${failures} differ` : 'all the same'}.`,
    );

    // The image files themselves: a note, not a failure (see the screenshot mask above).
    const differentImages: string[] = [];
    for (const imagePath of imagePaths) {
      const [a, b] = await Promise.all(
        [baseline, candidate].map((version) =>
          fetch(version.url + imagePath).then(async (r) => Buffer.from(await r.arrayBuffer())),
        ),
      );
      if (!a.equals(b)) differentImages.push(imagePath);
    }
    console.log(
      differentImages.length === 0
        ? `Image files: all ${imagePaths.size} identical.`
        : `Note: ${differentImages.length} of ${imagePaths.size} image files differ in their bytes ` +
            `(${differentImages.join(', ')}). The same file name means the same source image ` +
            'and settings; the AVIF encoder gives different output on different machines, so ' +
            'this is expected when one version was built locally and the other by Cloudflare.',
    );
    process.exitCode = failures ? 1 : 0;
  } finally {
    await browser.close();
    baseline.server?.close();
    candidate.server?.close();
  }
}

await main();
