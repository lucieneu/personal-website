// Images.

export type ImageLoading = 'lazy' | 'eager';

/**
 * The loading attributes for an image. Lazy is the default of Astro's Picture, so it needs
 * none. Eager is for the image above the fold that is often the largest element on the page;
 * it also gets fetchpriority="high".
 */
export function loadingAttributes(loading: ImageLoading) {
  return loading === 'eager' ? ({ loading: 'eager', fetchpriority: 'high' } as const) : {};
}
