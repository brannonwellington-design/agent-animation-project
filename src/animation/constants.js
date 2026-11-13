export const PAD = 24
export const CX = 46 + PAD
export const CY = 46 + PAD

export const LEFT = CX - 40
export const RIGHT = CX + 40
export const TOP = CY - 40
export const BOTTOM = CY + 40
export const INNER_TOP = CY - 20
export const INNER_BOTTOM = CY + 20
export const SPAN_MIN = CX - 32
export const SPAN_MAX = CX + 32
export const FLOOR_Y = CY + 36

export const WAVE_XS = [10, 24, 34, 46, 58, 68, 82].map(x => x + PAD)
export const BAR_XS = [8, 21, 34, 46, 58, 71, 84].map(x => x + PAD)

export const HOME = {
  tc: [CX, TOP],
  lt: [LEFT, INNER_TOP],
  rt: [RIGHT, INNER_TOP],
  cn: [CX, CY],
  lb: [LEFT, INNER_BOTTOM],
  rb: [RIGHT, INNER_BOTTOM],
  bc: [CX, BOTTOM],
}

export const VB = 92 + PAD * 2
export const DOTS = ["tc", "lt", "rt", "cn", "lb", "rb", "bc"]
export const CW = ["tc", "rt", "rb", "bc", "lb", "lt"]
export const ICON_SCALE = 2.8

// Goo filter defaults: blur amount, edge contrast, and the opacity cutoff where the
// blob edge sits (0–1). The filter's alpha is contrast * a - contrast * threshold.
export const DEFAULT_GOO = { blur: 5, contrast: 60, threshold: 0.3 }

export function uniformRadii(r) {
  return Object.fromEntries(DOTS.map(d => [d, r]))
}

