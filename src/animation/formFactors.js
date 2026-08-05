/** Wide speech-visualizer geometry. Square icon constants stay in constants.js. */

export const DEFAULT_ASPECT = 6
export const ASPECT_MIN = 2
export const ASPECT_MAX = 12

/** Base height of the wide viewBox; width = height * aspect.
 * Tall enough that loud speech fans don't clip at top/bottom center. */
export const WIDE_VB_H = 180
export const WIDE_PAD_X = 12
export const WIDE_PAD_Y = 8

/**
 * @param {number} aspect width/height ratio (e.g. 6)
 * @returns {{ vbW: number, vbH: number, cx: number, cy: number, left: number, right: number, top: number, bottom: number, span: number, aspect: number }}
 */
export function getWideBounds(aspect = DEFAULT_ASPECT) {
  const a = Math.max(ASPECT_MIN, Math.min(ASPECT_MAX, aspect))
  const vbH = WIDE_VB_H
  const vbW = vbH * a
  const left = WIDE_PAD_X
  const right = vbW - WIDE_PAD_X
  const top = WIDE_PAD_Y
  const bottom = vbH - WIDE_PAD_Y
  return {
    vbW,
    vbH,
    cx: vbW / 2,
    cy: vbH / 2,
    left,
    right,
    top,
    bottom,
    span: right - left,
    aspect: a,
  }
}

/** Pixel size for the SVG given a height (like the square `size` control) and aspect. */
export function getWidePixelSize(height, aspect = DEFAULT_ASPECT) {
  const a = Math.max(ASPECT_MIN, Math.min(ASPECT_MAX, aspect))
  return { width: height * a, height }
}
