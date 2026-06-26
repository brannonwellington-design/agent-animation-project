import { DOTS } from './constants.js'

export function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
export function easeOut(t)   { return 1 - Math.pow(1-t, 3) }

export function foldPingPong(t) { return t < 0.5 ? t * 2 : (1 - t) * 2 }

export function getMorphSpeed(mode, speed) {
  return mode === "morph" ? speed * 2 : speed
}

export function getLoopPhase(now, loopStart, speed, mode, audioLevelRef, audioMode) {
  const morphSpeed = getMorphSpeed(mode, speed)
  const rawT = loopStart !== null ? ((now - loopStart) % morphSpeed) / morphSpeed : 0
  const lvl = audioLevelRef?.current ?? 0
  return audioMode !== "off" ? (rawT + lvl * 0.35) % 1 : rawT
}

// Find optimal dot assignment: maps each current dot to the nearest target slot
// Uses greedy nearest-neighbor (good enough for 7 dots, avoids O(n!) brute force)
export function findBestRemap(currentPos, targetPos) {
  const remap = {}  // remap[dotId] = targetDotId — "dot dotId should animate toward target targetDotId"
  const available = new Set(DOTS)
  // Sort by distance to ensure best matches get priority
  const pairs = []
  for (const from of DOTS) {
    for (const to of DOTS) {
      const [fx, fy] = currentPos[from]
      const [tx, ty] = targetPos[to]
      pairs.push({ from, to, dist: Math.hypot(fx - tx, fy - ty) })
    }
  }
  pairs.sort((a, b) => a.dist - b.dist)
  const usedFrom = new Set()
  for (const { from, to } of pairs) {
    if (usedFrom.has(from) || !available.has(to)) continue
    remap[from] = to
    usedFrom.add(from)
    available.delete(to)
    if (usedFrom.size === DOTS.length) break
  }
  return remap
}