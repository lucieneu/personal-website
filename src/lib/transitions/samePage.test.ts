import { describe, expect, it } from 'vitest';
import { isPlainClick, isRouterLink, isSamePage } from '@/lib/transitions/samePage';

const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = (attributes: Record<string, string> = {}, target = '') => ({
  target,
  hasAttribute: (name: string) => name in attributes,
});

describe('isPlainClick', () => {
  it('accepts a left click', () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it('rejects other buttons and modifier keys', () => {
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
    for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const)
      expect(isPlainClick({ ...click, [key]: true })).toBe(false);
  });
});

describe('isRouterLink', () => {
  it('accepts a link that opens in this window', () => {
    expect(isRouterLink(link())).toBe(true);
    expect(isRouterLink(link({}, '_self'))).toBe(true);
  });

  it('rejects another window, a download and a link that reloads the page', () => {
    expect(isRouterLink(link({}, '_blank'))).toBe(false);
    expect(isRouterLink(link({ download: '' }))).toBe(false);
    expect(isRouterLink(link({ 'data-astro-reload': '' }))).toBe(false);
  });
});

describe('isSamePage', () => {
  const here = new URL('https://reller.nl/en/blog/?page=2');

  it('is true for the same path and query', () => {
    expect(isSamePage(new URL('https://reller.nl/en/blog/?page=2'), here)).toBe(true);
  });

  it('is false for another path, query, origin or a #hash', () => {
    expect(isSamePage(new URL('https://reller.nl/en/now/?page=2'), here)).toBe(false);
    expect(isSamePage(new URL('https://reller.nl/en/blog/'), here)).toBe(false);
    expect(isSamePage(new URL('https://example.com/en/blog/?page=2'), here)).toBe(false);
    expect(isSamePage(new URL('https://reller.nl/en/blog/?page=2#top'), here)).toBe(false);
  });
});
