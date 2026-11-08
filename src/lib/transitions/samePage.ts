// A link to the page you're on (the current item in the navigation, the name in the header on
// the home page) plays no transition: ClientRouter would load the same page again and hand the
// card off to itself. Such a click only scrolls back to the top.

/** A plain left click: not with a modifier key, which opens a tab or window. */
export const isPlainClick = (
  click: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
) => click.button === 0 && !(click.metaKey || click.ctrlKey || click.shiftKey || click.altKey);

/** Whether following the link would navigate this window by ClientRouter (no download, reload or other window). */
export const isRouterLink = (link: Pick<HTMLAnchorElement, 'target' | 'hasAttribute'>) =>
  (!link.target || link.target === '_self') &&
  !link.hasAttribute('download') &&
  !link.hasAttribute('data-astro-reload');

/** Whether `to` is the page at `here`, with the same query and no #hash to jump to. */
export const isSamePage = (to: URL, here: URL) =>
  to.origin === here.origin &&
  to.pathname === here.pathname &&
  to.search === here.search &&
  !to.hash;

/**
 * Makes a click on a link to the page you're on only scroll back to the top. Links with a #hash,
 * downloads, links that reload the page and clicks that open a new tab or window are left alone.
 * Runs before ClientRouter's own click handler (capture phase), which skips clicks that are
 * already handled. Call it once, from a script on every page.
 */
export function stayOnSamePage() {
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!isPlainClick(event) || !isRouterLink(link)) return;
      if (!isSamePage(new URL(link.href), new URL(location.href))) return;
      event.preventDefault();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    },
    { capture: true },
  );
}
