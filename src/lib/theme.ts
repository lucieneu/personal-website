// The theme switch. Every color token is a light-dark() value, so switching the theme only sets
// `data-theme` on <html> (which switches `color-scheme`). ThemeScript.astro applies the stored
// choice before the first paint; without one, the site follows the OS preference.

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

/** The theme on screen: the stored choice, or else the OS preference. */
export function currentTheme(): Theme {
  const { theme } = document.documentElement.dataset;
  if (theme === 'light' || theme === 'dark') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is blocked: the choice still lasts while navigating, just not after a reload.
  }
  document.dispatchEvent(new CustomEvent<Theme>('theme-change', { detail: theme }));
}

/**
 * Switches to the other theme. The new theme is revealed as a circle that grows from the click;
 * without the View Transitions API, or with reduced motion, it switches instantly.
 */
export function toggleTheme(event: MouseEvent) {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) {
    setTheme(next);
    return;
  }

  // A click from the keyboard (Enter or Space) has no pointer position, so the circle grows
  // from the middle of the button instead.
  let { clientX: x, clientY: y } = event;
  if (event.detail === 0 && event.currentTarget instanceof Element) {
    const box = event.currentTarget.getBoundingClientRect();
    x = box.left + box.width / 2;
    y = box.top + box.height / 2;
  }
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  // Turns off the named elements (card, sidebar) for this transition, so the whole page is
  // revealed at once instead of each part crossfading on its own. See transitions.css.
  const root = document.documentElement;
  root.classList.add('theme-transition');
  const transition = document.startViewTransition(() => setTheme(next));
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 450, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' },
    );
  });
  transition.finished.finally(() => root.classList.remove('theme-transition'));
}
