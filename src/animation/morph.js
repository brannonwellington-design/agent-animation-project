import { CX, CY, HOME, DOTS } from './constants.js'
import { easeInOut, foldPingPong } from './easing.js'

export const DEFAULT_MORPH_TIMELINE = {
  convergeEnd:  0.35,
  quiverStart:  0.01,
  quiverPeak:   0.40,
  quiverEnd:    0.80,
  quiverCycles: 1.5,
  iconStart:    0.40,
  blobShrink:   0.40,
  crossEnd:     0.80,
  blobStroke:   30,
}

export function withMorphTimeline(mt) {
  return { ...DEFAULT_MORPH_TIMELINE, ...mt }
}

// MORPH — forward: dots converge → quiver → icon grows out of blob
//          reverse: icon shrinks back → quiver → dots expand home (seamless ping-pong loop)
// t folds at 0.5: second half mirrors first half exactly in reverse
export function modeMorph(t, baseR, _now, mt) {
  const timeline = withMorphTimeline(mt)
  const tf = foldPingPong(t)

  const convergeEnd = timeline.convergeEnd
  const crossStart  = timeline.blobShrink
  const crossEnd    = timeline.crossEnd

  let posBlend, radScale

  if (tf < convergeEnd) {
    posBlend = easeInOut(tf / convergeEnd)
    radScale = 1
  } else if (tf < crossEnd) {
    posBlend = 1
    const x = Math.max(0, (tf - crossStart) / (crossEnd - crossStart))
    radScale = 1 - easeInOut(Math.min(x, 1))
  } else {
    posBlend = 1
    radScale = 0
  }

  const pos = {}; const r = {}
  for (const d of DOTS) {
    const [hx, hy] = HOME[d]
    pos[d] = [hx + (CX - hx) * posBlend, hy + (CY - hy) * posBlend]
    r[d] = baseR * radScale
  }
  return { pos, r }
}
