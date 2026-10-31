/**
 * After a client-side navigation, moves focus to the new content (`#content`), so keyboard and
 * screen reader users start at the top of the page they asked for, as on a full page load.
 * ClientRouter announces the new page title on its own. preventScroll keeps the restored scroll
 * position on Back. Call it once, from a script on every page.
 */
export function focusContentAfterNavigation() {
  document.addEventListener('astro:after-swap', () => {
    document.getElementById('content')?.focus({ preventScroll: true });
  });
}
