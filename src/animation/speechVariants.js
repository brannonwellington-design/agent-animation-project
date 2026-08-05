/** Speech visualizer variants for the wide form factor. */

export const SPEECH_VARIANTS = {
  pearlStrings: updatePearlStrings,
}

export const SPEECH_VARIANT_LABELS = {
  pearlStrings: "Pearl Strings",
}

export const SPEECH_VARIANT_KEYS = Object.keys(SPEECH_VARIANTS)
export const DEFAULT_SPEECH_VARIANT = "pearlStrings"

export const DEFAULT_STRING_COUNT = 4
export const DEFAULT_DOTS_PER_STRING = 40
export const DEFAULT_STRING_STAGGER = 0
export const DEFAULT_EDGE_OVERLAP = 0.45
export const DEFAULT_STAGGER_MODE = "even" // "even" | "random"
export const STRING_COUNT_MIN = 1
export const STRING_COUNT_MAX = 12
export const DOTS_PER_STRING_MIN = 4
export const DOTS_PER_STRING_MAX = 40
export const STRING_STAGGER_MIN = 0
export const STRING_STAGGER_MAX = 1
export const EDGE_OVERLAP_MIN = 0
export const EDGE_OVERLAP_MAX = 1
export const BAND_SENSITIVITY_MIN = 0
export const BAND_SENSITIVITY_MAX = 2.5

/** Spindle fan amount along a string: longer edgeOverlap → longer unified ends, sharper center. */
export function spindleFan(t, edgeOverlap = DEFAULT_EDGE_OVERLAP) {
  // Hold near-zero across `edge` fraction on each side, then rise across the middle
  const edge = edgeOverlap * 0.48
  const denom = Math.max(1e-4, 1 - 2 * edge)
  const mid = clamp((t - edge) / denom, 0, 1)
  // Extra pinch so high overlap also steepens the center rise
  const pinch = 1 + edgeOverlap * 2.2
  return Math.pow(Math.sin(mid * Math.PI), pinch)
}

/** Stable per-string personality hash in [0,1). */
function stringSeed(s, salt = 0) {
  const x = Math.sin((s + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function idleBreathe(now, amp = 1) {
  return Math.sin(now * 1.4) * 0.35 * amp + Math.sin(now * 0.7) * 0.2 * amp
}

function featureDrive(features, audioGain) {
  const silence = features?.silence ?? true
  const energy = silence ? 0 : (features?.energy ?? 0) * audioGain
  const pitchNorm = silence ? 0 : (features?.pitchNorm ?? 0)
  const centroid = features?.centroid ?? 0.3
  const voiced = silence ? 0.5 : (features?.voiced ?? 0)
  const bands = features?.bands ?? null
  return { silence, energy, pitchNorm, centroid, voiced, bands }
}

export function pearlParticleCount(stringCount, dotsPerString) {
  return Math.max(1, stringCount) * Math.max(1, dotsPerString)
}

/**
 * Per-string horizontal phase as a fraction of one pearl spacing [0, 1).
 * - even: 0, 1/n, 2/n… (can read as diagonals)
 * - random: same unique slots, shuffled per seed so each string gets a
 *   different offset amount without lining up into a diagonal
 */
export function buildStringStaggers(stringCount, staggerMode, seed = 1) {
  if (stringCount <= 1) return [0]
  const slots = Array.from({ length: stringCount }, (_, s) => s / stringCount)
  if (staggerMode !== "random") return slots

  // Fisher–Yates shuffle driven by seed — every string gets a unique phase
  const vals = slots.slice()
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(stringSeed(i, seed + 17) * (i + 1))
    const tmp = vals[i]
    vals[i] = vals[j]
    vals[j] = tmp
  }
  return vals
}

/** Horizontal offset for string `s` in viewBox units (fraction of pearl spacing × stagger). */
export function stringStaggerOffset(s, stagger, spacing, staggers) {
  if (stagger <= 0 || !staggers) return 0
  const frac = staggers[s] ?? 0
  return frac * stagger * spacing
}

export function ensureParticles(variant, particles, bounds, opts = {}) {
  const stringCount = opts.stringCount ?? DEFAULT_STRING_COUNT
  const dotsPerString = opts.dotsPerString ?? DEFAULT_DOTS_PER_STRING
  const stringStagger = opts.stringStagger ?? DEFAULT_STRING_STAGGER
  const edgeOverlap = opts.edgeOverlap ?? DEFAULT_EDGE_OVERLAP
  const staggerMode = opts.staggerMode ?? DEFAULT_STAGGER_MODE
  const staggerSeed = opts.staggerSeed ?? 1

  const n = pearlParticleCount(stringCount, dotsPerString)

  const spanKey = Math.round(bounds.span * 10)
  const configKey = `${stringCount}x${dotsPerString}x${Math.round(stringStagger * 100)}x${Math.round(edgeOverlap * 100)}x${staggerMode}x${staggerSeed}`

  if (
    particles.length === n
    && particles._variant === variant
    && particles._spanKey === spanKey
    && particles._configKey === configKey
  ) {
    return particles
  }

  const staggers = buildStringStaggers(stringCount, staggerMode, staggerSeed)
  const next = new Array(n)
  for (let i = 0; i < n; i++) {
    const s = Math.floor(i / dotsPerString)
    const d = i % dotsPerString
    const spacing = bounds.span / Math.max(1, dotsPerString - 1)
    const staggerPad = stringStagger * spacing
    const usableSpan = Math.max(spacing, bounds.span - staggerPad)
    const t = dotsPerString === 1 ? 0.5 : d / (dotsPerString - 1)
    const x = bounds.left + t * usableSpan
      + stringStaggerOffset(s, stringStagger, spacing, staggers)
    const stringT = stringCount === 1 ? 0 : s / (stringCount - 1)
    const stringOffset = (stringT - 0.5) * 2 // -1..1
    const fan = spindleFan(t, edgeOverlap)
    const y = bounds.cy + stringOffset * fan * bounds.vbH * 0.18
    next[i] = {
      x,
      y,
      vx: 0,
      vy: 0,
      r: 6,
      homeX: x,
      homeY: y,
      col: i,
    }
  }
  next._variant = variant
  next._spanKey = spanKey
  next._configKey = configKey
  next._cy = bounds.cy
  next._stringCount = stringCount
  next._dotsPerString = dotsPerString
  next._stringStagger = stringStagger
  next._edgeOverlap = edgeOverlap
  next._staggerMode = staggerMode
  next._staggers = staggers
  next._stringDrive = new Array(stringCount).fill(0)
  return next
}

// ── Pearl Strings (spindle of horizontal pearl strands) ───────────────────────
/**
 * Multiple horizontal strings of equal-sized circles.
 * Strings converge (overlap) at left/right ends and fan apart in the center.
 */
function updatePearlStrings(features, bounds, particles, dt, now, baseR, audioGain, opts = {}) {
  const { silence, energy, pitchNorm, centroid, voiced, bands } = featureDrive(features, audioGain)
  const stringCount = opts.stringCount ?? particles._stringCount ?? DEFAULT_STRING_COUNT
  const dotsPerString = opts.dotsPerString ?? particles._dotsPerString ?? DEFAULT_DOTS_PER_STRING
  const stringStagger = opts.stringStagger ?? particles._stringStagger ?? DEFAULT_STRING_STAGGER
  const edgeOverlap = opts.edgeOverlap ?? particles._edgeOverlap ?? DEFAULT_EDGE_OVERLAP
  const audioEdgeOverlap = opts.audioEdgeOverlap ?? false
  const staggerMode = opts.staggerMode ?? particles._staggerMode ?? DEFAULT_STAGGER_MODE
  const staggerSeed = opts.staggerSeed ?? 1
  // Always derive from current opts so mode/seed changes apply immediately
  const staggers = buildStringStaggers(stringCount, staggerMode, staggerSeed)
  particles._staggers = staggers
  particles._staggerMode = staggerMode
  const n = particles.length

  // Audio-reactive edge overlap: crosses threshold → swings hard toward 1, else settles to 0
  if (particles._edgeDrive == null) particles._edgeDrive = 0
  let edgeTarget = 0
  if (!silence) {
    const raw = clamp(energy * 0.75 + centroid * 0.5, 0, 1)
    // Edge overlap slider acts as threshold: higher = needs louder/sharper audio
    const threshold = 0.06 + edgeOverlap * 0.28
    const gated = raw <= threshold ? 0 : (raw - threshold) / Math.max(0.15, 1 - threshold)
    // Expand mid values so hits feel decisive (full 0↔1 swing)
    edgeTarget = clamp(Math.pow(gated, 0.55), 0, 1)
  }
  const edgeSmooth = edgeTarget > particles._edgeDrive ? 0.75 : 0.14
  particles._edgeDrive += (edgeTarget - particles._edgeDrive) * clamp(edgeSmooth * 16 * dt, 0, 1)
  const effectiveOverlap = audioEdgeOverlap
    ? particles._edgeDrive
    : edgeOverlap

  // Per-string smoothed drive — each string listens to band (s % bandCount)
  if (!particles._stringDrive || particles._stringDrive.length !== stringCount) {
    particles._stringDrive = new Array(stringCount).fill(0)
  }
  const stringDrive = particles._stringDrive
  const bandCount = bands?.length ?? 0
  for (let s = 0; s < stringCount; s++) {
    const seedA = stringSeed(s, 1)
    const seedB = stringSeed(s, 2)
    const bandIdx = bandCount > 0 ? s % bandCount : -1
    const neighbor = bandCount > 0 ? (bandIdx + 1) % bandCount : -1
    const bandLvl = bandIdx >= 0
      ? (bands[bandIdx] * 0.75 + bands[neighbor] * 0.25) * audioGain
      : energy
    const raw = silence ? 0 : (bandLvl * (0.6 + seedB * 0.65) + energy * (0.2 + seedA * 0.3))
    const attack = 0.35 + seedA * 0.45
    const release = 0.04 + seedB * 0.1
    const cur = stringDrive[s]
    stringDrive[s] = raw > cur
      ? cur + (raw - cur) * clamp(attack * 12 * dt, 0, 1)
      : cur + (raw - cur) * clamp(release * 12 * dt, 0, 1)
  }

  // Cap motion so loud peaks stay inside the taller viewBox
  const restFan = bounds.vbH * 0.16
  const grainBase = silence ? 0.2 : (1 - voiced) * (1.5 + centroid * 2)

  const spacing = bounds.span / Math.max(1, dotsPerString - 1)
  const staggerPad = stringStagger * spacing
  const usableSpan = Math.max(spacing, bounds.span - staggerPad)
  const usableSpacing = usableSpan / Math.max(1, dotsPerString - 1)
  const pearlR = clamp(
    Math.min(baseR * 0.55, usableSpacing * 0.42),
    2.5,
    bounds.vbH * 0.14,
  )

  for (let i = 0; i < n; i++) {
    const s = Math.floor(i / dotsPerString)
    const d = i % dotsPerString
    if (s >= stringCount) {
      particles[i].r = 0.01
      continue
    }

    const seedA = stringSeed(s, 1)
    const seedB = stringSeed(s, 2)
    const seedC = stringSeed(s, 3)
    const drive = stringDrive[s]
    const pitchY = pitchNorm * bounds.vbH * (0.03 + seedC * 0.1) * (seedA > 0.5 ? 1 : -0.65)

    const fanAmp = silence
      ? restFan * (0.8 + idleBreathe(now + seedA * 3, 0.12) * (0.7 + seedB * 0.5))
      : restFan * (0.65 + drive * (0.75 + seedA * 0.55) + energy * 0.2)

    const t = dotsPerString === 1 ? 0.5 : d / (dotsPerString - 1)
    const x = bounds.left
      + t * usableSpan
      + stringStaggerOffset(s, stringStagger, spacing, staggers)

    const fan = spindleFan(t, effectiveOverlap)
    const stringT = stringCount === 1 ? 0.5 : s / (stringCount - 1)
    const stringOffset = (stringT - 0.5) * 2
    // When audio pulls edges together, also ease fan amplitude inward
    const condense = audioEdgeOverlap ? particles._edgeDrive : 0
    const fanAmpLive = fanAmp * (1 - condense * 0.55)

    const freq = 1.2 + seedB * 2.4
    const speed = silence ? 0.6 + seedA * 0.5 : 1.2 + drive * (2 + seedC * 3) + energy
    const stringPhase = seedA * Math.PI * 2
    const wave = Math.sin(t * Math.PI * freq - now * speed + stringPhase)
      * fan
      * (silence ? 1.1 + seedB : 1.2 + drive * (3 + seedA * 3.5))

    const grain = grainBase * (0.6 + seedC * 0.9)
    const jitter = Math.sin(now * (12 + seedB * 16) + i * 1.3 + s) * grain * fan

    const r = silence
      ? pearlR * (0.96 + idleBreathe(now + s, 0.04))
      : pearlR * (0.88 + drive * (0.25 + seedB * 0.2) + energy * 0.08)

    const y = bounds.cy
      + pitchY * fan
      + stringOffset * fan * fanAmpLive
      + wave
      + jitter

    const p = particles[i]
    const follow = 10 + seedA * 8
    p.x += (x - p.x) * clamp(follow * dt, 0, 1)
    p.y += (y - p.y) * clamp(follow * dt, 0, 1)
    p.r = r
  }
  return particles
}
