export type ProgressTimes = { startedAt: number; endsAt: number };

/**
 * A `data-init` expression running `keyframes` on the element from
 * `startedAt` to `endsAt` (server clock, ms), seeked to the elapsed time
 * using the `_serverOffset` signal from `Game`.
 */
export const animateBetween = (times: ProgressTimes, keyframes: object) =>
  `el.animate(${JSON.stringify(keyframes)}, { duration: ${
    times.endsAt - times.startedAt
  }, delay: ${times.startedAt} - Date.now() - $_serverOffset, fill: 'forwards' })`;
