// Which way the navigation in progress goes, so the card hand-off and the starfield can mirror
// themselves on Back.

let back = false;

/** Whether the navigation in progress goes Back. */
export const goingBack = () => back;

/** Starts to track the direction of every navigation. Call it once, from a script on every page. */
export function trackDirection() {
  document.addEventListener('astro:before-preparation', (event) => {
    back = event.direction === 'back';
  });
}
