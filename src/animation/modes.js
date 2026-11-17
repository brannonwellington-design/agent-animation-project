import {
  CX, CY, WAVE_XS, BAR_XS, HOME, DOTS, CW,
  SPAN_MIN, SPAN_MAX, FLOOR_Y, uniformRadii,
} from './constants.js'
import { easeInOut, easeOut } from './easing.js'

function permutedState(slotMap) {
  const pos = {}
  for (const d of DOTS) pos[d] = [...HOME[slotMap[d]]]
  return pos
}

const AF_STATES = [
  { tc: "tc", lt: "lt", rt: "rt", cn: "cn", lb: "lb", rb: "rb", bc: "bc" },
  { tc: "rt", lt: "tc", rt: "cn", cn: "lt", lb: "lb", rb: "rb", bc: "bc" },
  { tc: "rb", lt: "tc", rt: "rt", cn: "lt", lb: "lb", rb: "bc", bc: "cn" },
  { tc: "bc", lt: "tc", rt: "rt", cn: "lt", lb: "cn", rb: "lb", bc: "rb" },
  { tc: "lb", lt: "tc", rt: "rt", cn: "cn", lb: "bc", rb: "lt", bc: "rb" },
].map(permutedState)

export function modeStatic(t, r)  { return { pos:{...HOME}, r:uniformRadii(r) } }

export function modeBreathe(t, baseR) {
  const scale = 1 + 0.45 * Math.sin(t * Math.PI * 2)
  const pos = {}; const r = {}
  for (const d of DOTS) {
    const [hx, hy] = HOME[d]
    pos[d] = [CX + (hx - CX) * scale, CY + (hy - CY) * scale]
    r[d] = baseR
  }
  return { pos, r }
}

export function modeFaceSimple(t, baseR, slots) {
  const step = Math.floor(t*4)%4
  const ease = easeInOut(Math.min(((t*4)%1)/0.6,1))
  const pos = {...HOME}; const r = uniformRadii(baseR)
  for (let i=0; i<4; i++) {
    const dotIdx = ((i-step)%4+4)%4
    const dot = slots[dotIdx]
    const prevSlot = slots[((dotIdx-1)%4+4)%4]
    const [x1,y1] = HOME[prevSlot]; const [x2,y2] = HOME[slots[dotIdx]]
    pos[dot] = [x1+(x2-x1)*ease, y1+(y2-y1)*ease]
  }
  return { pos, r }
}

export function modeAllFaces(t, baseR) {
  const phase = Math.min(Math.floor(t*4),3)
  const ease = easeInOut(Math.min(((t*4)%1)/0.6,1))
  const from = AF_STATES[phase]; const to = AF_STATES[phase+1]
  const pos = {}
  for (const d of DOTS) { const [x1,y1]=from[d],[x2,y2]=to[d]; pos[d]=[x1+(x2-x1)*ease,y1+(y2-y1)*ease] }
  return { pos, r: uniformRadii(baseR) }
}

export function modeCombine(t, baseR) {
  let m = t<0.15?easeInOut(t/0.15):t<0.35?1:t<0.5?easeInOut(1-(t-0.35)/0.15):0
  const pos = {}
  for (const d of DOTS) {
    const [hx, hy] = HOME[d]
    pos[d] = [hx + (CX - hx) * m, hy + (CY - hy) * m]
  }
  return { pos, r: uniformRadii(baseR) }
}

export function modeRotate(t, baseR) {
  const step = Math.floor(t*6)%6
  const ease = easeInOut(Math.min(((t*6)%1)/0.6,1))
  const pos = { cn: [CX, CY] }
  for (let i=0;i<6;i++) {
    const [x1,y1]=HOME[CW[(i+step)%6]],[x2,y2]=HOME[CW[(i+step+1)%6]]
    pos[CW[i]]=[x1+(x2-x1)*ease,y1+(y2-y1)*ease]
  }
  return { pos, r: uniformRadii(baseR) }
}

export function modePairSwap(t, baseR) {
  const pairs = [["tc","bc"],["lt","rb"],["rt","lb"]]
  const phase = Math.floor(t*3)%3
  const ease = easeInOut(Math.min(((t*3)%1)/0.6,1))
  const pos = {...HOME}; const r = uniformRadii(baseR)
  const [a,b] = pairs[phase]
  const [ax,ay]=HOME[a],[bx,by]=HOME[b]
  const arc = Math.sin(ease*Math.PI)*20
  const len = Math.hypot(bx-ax,by-ay)
  const nx=-(by-ay)/len, ny=(bx-ax)/len
  pos[a]=[ax+(bx-ax)*ease+nx*arc, ay+(by-ay)*ease+ny*arc]
  pos[b]=[bx+(ax-bx)*ease-nx*arc, by+(ay-by)*ease-ny*arc]
  return { pos, r }
}


export function modeWave(t, baseR) {
  const pos = {...HOME}; const r = {}
  for (let i=0;i<6;i++) {
    const phase = (t - i/6 + 1)%1
    r[CW[i]] = baseR * (1 + 0.8*Math.max(0,Math.sin(phase*Math.PI*2)))
  }
  r["cn"] = baseR*(1+0.5*Math.sin(t*Math.PI*2))
  return { pos, r }
}

export function modeTypewriter(t, baseR) {
  const order = ["tc","rt","rb","bc","lb","lt","cn"]; const n=order.length
  const pos = {...HOME}; const r = {}
  for (let i=0;i<n;i++) {
    const as=(i/n)*0.44, ae=as+0.44/n, ds=0.56+(i/n)*0.44, de=ds+0.44/n
    let s=0
    if(t>=as&&t<ae) s=easeOut((t-as)/(ae-as))
    else if(t>=ae&&t<ds) s=1
    else if(t>=ds&&t<de) s=1-easeOut((t-ds)/(de-ds))
    r[order[i]]=baseR*s
  }
  return { pos, r }
}

export function modeSplit(t, baseR) {
  const step=Math.floor(t*3)%3; const ease=easeInOut(Math.min(((t*3)%1)/0.6,1))
  const cwG=["tc","rb","lb"], ccwG=["rt","bc","lt"]
  const cwT=[["tc","rb","lb"],["rb","lb","tc"],["lb","tc","rb"]]
  const ccwT=[["rt","bc","lt"],["lt","rt","bc"],["bc","lt","rt"]]
  const pos = { cn: [CX, CY] }; const r = uniformRadii(baseR)
  for(let i=0;i<3;i++){
    const [x1,y1]=HOME[cwT[(step+2)%3][i]],[x2,y2]=HOME[cwT[step][i]]
    pos[cwG[i]]=[x1+(x2-x1)*ease,y1+(y2-y1)*ease]
    const [cx1,cy1]=HOME[ccwT[(step+2)%3][i]],[cx2,cy2]=HOME[ccwT[step][i]]
    pos[ccwG[i]]=[cx1+(cx2-cx1)*ease,cy1+(cy2-cy1)*ease]
  }
  return { pos, r }
}

// ─── ADDITIONAL MODES ────────────────────────────────────────────────────────────────

// GEOMETRIC: Triangle — dots collapse to 3 triangle vertices (+ center), rotate slowly
const TRI = [
  [CX, CY - 36],
  [CX - 34, CY + 26],
  [CX + 34, CY + 26],
]
export function modeTriangle(t, baseR) {
  let blend
  if (t < 0.25) blend = easeInOut(t / 0.25)
  else if (t < 0.75) blend = 1
  else blend = easeInOut(1 - (t - 0.75) / 0.25)
  const spin = t * Math.PI * 2
  const rotTri = TRI.map(([px, py]) => {
    const dx = px - CX, dy = py - CY
    return [
      CX + dx * Math.cos(spin) - dy * Math.sin(spin),
      CY + dx * Math.sin(spin) + dy * Math.cos(spin),
    ]
  })
  const targets = [rotTri[0], rotTri[1], rotTri[2], rotTri[0], rotTri[1], rotTri[2], [CX, CY]]
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx,hy] = HOME[d]
    const [tx,ty] = targets[i]
    pos[d] = [hx+(tx-hx)*blend, hy+(ty-hy)*blend]
    r[d] = baseR
  })
  return { pos, r }
}

// GEOMETRIC: Arrow — dots form a plus sign, arms breathe in/out
export function modeArrow(t, baseR) {
  const arm = 36 * (1 + 0.25 * Math.sin(t * Math.PI * 2))
  const targets = {
    tc: [CX, CY - arm], bc: [CX, CY + arm],
    lt: [CX - arm, CY], rt: [CX + arm, CY],
    cn: [CX, CY],
    lb: [CX - arm * 0.5, CY + arm * 0.5],
    rb: [CX + arm * 0.5, CY + arm * 0.5],
  }
  let blend
  if (t < 0.2) blend = easeInOut(t / 0.2)
  else if (t < 0.8) blend = 1
  else blend = easeInOut(1 - (t - 0.8) / 0.2)
  const pos = {}; const r = {}
  for (const d of DOTS) {
    const [hx,hy] = HOME[d]; const [tx,ty] = targets[d]
    pos[d] = [hx+(tx-hx)*blend, hy+(ty-hy)*blend]
    r[d] = baseR
  }
  return { pos, r }
}

// CHAOS: Scatter — 7 dots bounce off walls independently, clean loop via integer bounces
// Each dot gets a unique integer number of x and y bounces per loop
const SCATTER_PARAMS = [
  { bx:3, by:2, px:0.00, py:0.00 },
  { bx:2, by:3, px:0.14, py:0.57 },
  { bx:4, by:3, px:0.28, py:0.21 },
  { bx:3, by:4, px:0.42, py:0.78 },
  { bx:5, by:2, px:0.56, py:0.35 },
  { bx:2, by:5, px:0.70, py:0.92 },
  { bx:4, by:5, px:0.85, py:0.14 },
]
export function modeScatter(t, baseR) {
  const pos = {}; const r = {}
  const span = SPAN_MAX - SPAN_MIN
  DOTS.forEach((d, i) => {
    const { bx, by, px, py } = SCATTER_PARAMS[i]
    const tx = ((t + px) % 1)
    const ty = ((t + py) % 1)
    const x = SPAN_MIN + Math.abs(((tx * bx * 2) % 2) - 1) * span
    const y = SPAN_MIN + Math.abs(((ty * by * 2) % 2) - 1) * span
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// CHAOS: Gravity — dots fall to a floor staggered, squish, bounce back
export function modeGravity(t, baseR) {
  const floor = FLOOR_Y
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx,hy] = HOME[d]
    const delay = i * 0.08
    const lt = ((t - delay + 1) % 1)
    let y, scaleY=1
    if (lt < 0.35) {
      y = hy + (floor - hy) * easeInOut(lt / 0.35)
    } else if (lt < 0.45) {
      y = floor
      scaleY = 1 - Math.sin(((lt-0.35)/0.1)*Math.PI)*0.3
    } else if (lt < 0.8) {
      y = floor + (hy - floor) * easeOut((lt-0.45)/0.35)
    } else {
      y = hy
    }
    pos[d] = [hx, y]
    r[d] = baseR * scaleY
  })
  return { pos, r }
}


// RHYTHM: Metronome — dots swing side to side in staggered delay
export function modeMetronome(t, baseR) {
  const pos = {}; const r = {}
  const swing = 18
  DOTS.forEach((d, i) => {
    const [hx,hy] = HOME[d]
    const delay = i * (1 / DOTS.length) * 0.5
    const lt = (t - delay + 1) % 1
    const x = hx + swing * Math.sin(lt * Math.PI * 2)
    pos[d] = [x, hy]
    r[d] = baseR
  })
  return { pos, r }
}

// RHYTHM: Morse — dots pulse radii in SOS pattern (... --- ...)
const MORSE_SOS = [0.15,0,0.15,0,0.15,0, 0.1,0.5,0.1,0, 0.5,0,0.5,0,0.5,0, 0.1,0.5,0.1,0, 0.15,0,0.15,0,0.15,0, 0.2]
const MORSE_TOTAL = MORSE_SOS.reduce((a,b)=>a+b,0)
function morsePulseAt(tAbs) {
  let acc = 0
  for (let i=0; i<MORSE_SOS.length; i++) {
    acc += MORSE_SOS[i]
    if (tAbs < acc) return i%2===0 ? 1 : 0
  }
  return 0
}
export function modeMorse(t, baseR) {
  const pos = {...HOME}; const r = {}
  DOTS.forEach((d, i) => {
    const offset = i * (MORSE_TOTAL / DOTS.length)
    const tAbs = (t * MORSE_TOTAL + offset) % MORSE_TOTAL
    const on = morsePulseAt(tAbs)
    r[d] = baseR * (0.3 + 0.7 * on)
  })
  return { pos, r }
}

// NARRATIVE: Chase — three dots race around the outer ring
export function modeChase(t, baseR) {
  const n = CW.length
  const getPosOnRing = (ft) => {
    const norm = ((ft % 1) + 1) % 1
    const slotF = norm * n
    const slot = Math.floor(slotF) % n
    const frac = easeInOut(slotF % 1)
    const [x1,y1] = HOME[CW[slot]]
    const [x2,y2] = HOME[CW[(slot+1)%n]]
    return [x1+(x2-x1)*frac, y1+(y2-y1)*frac]
  }
  const pos = {}; const r = {}
  for (const d of DOTS) { pos[d] = [...HOME[d]]; r[d] = 0 }
  // lt, cn, lb — none are in CW so positions won't be overwritten
  pos["lt"] = getPosOnRing(t)
  pos["cn"] = getPosOnRing(t - 0.16)
  pos["lb"] = getPosOnRing(t - 0.32)
  r["lt"] = baseR
  r["cn"] = baseR * 0.8
  r["lb"] = baseR * 0.6
  return { pos, r }
}

// NARRATIVE: Flock — all dots drift toward a slowly moving centroid, then scatter
export function modeFlock(t, baseR) {
  // centroid wanders in a figure-8
  const cx = CX + 22 * Math.sin(t * Math.PI * 2)
  const cy = CY + 14 * Math.sin(t * Math.PI * 4)
  // 0→0.4: flock toward centroid, 0.4→0.6: hold tight, 0.6→1: disperse
  let blend
  if (t < 0.4) blend = easeInOut(t/0.4)
  else if (t < 0.6) blend = 1
  else blend = easeInOut(1-(t-0.6)/0.4)
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx,hy] = HOME[d]
    // each dot flocks to a slightly offset position around centroid
    const angle = (i/DOTS.length)*Math.PI*2
    const spread = (1-blend)*6
    const tx = cx + Math.cos(angle)*spread
    const ty = cy + Math.sin(angle)*spread
    pos[d] = [hx+(tx-hx)*blend, hy+(ty-hy)*blend]
    r[d] = baseR * (1 - blend*0.15)
  })
  return { pos, r }
}

// ─── AUDIO-STYLE MODES (time-driven) ──────────────────────────────────────────

// OSCILLOSCOPE — dots trace a morphing sine wave across the icon L→R, seamless
export function modeOscilloscope(t, baseR, now) {
  const pos = {}; const r = {}
  const amp = 28
  // drive with raw `now` so the wave scrolls continuously with no reset jump
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const y = CY
      + amp * 0.65 * Math.sin((xNorm * 2.5 + time * 0.5) * Math.PI * 2)
      + amp * 0.35 * Math.sin((xNorm * 4.1 - time * 0.65) * Math.PI * 2)
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// Deterministic pseudo-random for noise modes
function seededRand(seed) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

// NOISE — dots stay near home, small tight vibration only, no size change
export function modeNoise(t, baseR) {
  const pos = {}; const r = {}
  const jitter = 5
  DOTS.forEach((d, i) => {
    const [hx, hy] = HOME[d]
    const ti = Math.floor(t * 24)
    const tf = (t * 24) % 1
    const rx1 = seededRand(i * 100 + ti) - 0.5
    const ry1 = seededRand(i * 100 + ti + 50) - 0.5
    const rx2 = seededRand(i * 100 + ti + 1) - 0.5
    const ry2 = seededRand(i * 100 + ti + 51) - 0.5
    const e = easeInOut(tf)
    pos[d] = [hx + (rx1 + (rx2 - rx1) * e) * jitter, hy + (ry1 + (ry2 - ry1) * e) * jitter]
    r[d] = baseR
  })
  return { pos, r }
}


export function modeStutter(t, baseR) {
  // irregular grid of "edit points" — dots snap between positions abruptly
  const stutterRate = 8  // snaps per loop
  const snap = Math.floor(t * stutterRate)
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx, hy] = HOME[d]
    // each dot picks a random frozen offset at each snap point
    const ox = (seededRand(i * 77 + snap * 13) - 0.5) * 30
    const oy = (seededRand(i * 77 + snap * 13 + 99) - 0.5) * 30
    // occasionally a dot drops to zero size — missing sample
    const present = seededRand(i * 77 + snap * 13 + 44) > 0.15
    pos[d] = [hx + ox, hy + oy]
    r[d] = present ? baseR : 0
  })
  return { pos, r }
}

// REVERB — dots echo outward from center with decaying size, like a reverb tail
export function modeReverb(t, baseR) {
  // 6 outer dots = 6 echo taps at staggered delays, center = dry signal
  const pos = {}; const r = {}
  pos["cn"] = [CX, CY]
  r["cn"] = baseR * (0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI * 2)))
  const echoSlots = ["tc", "rt", "rb", "bc", "lb", "lt"]
  echoSlots.forEach((d, i) => {
    // each echo fires at a staggered phase and decays outward
    const delay = i / echoSlots.length
    const lt = ((t - delay) + 1) % 1  // each tap offset in time
    // echo expands from center then fades
    const expand = easeOut(lt)
    const decay = 1 - lt  // amplitude decays over time
    const [hx, hy] = HOME[d]
    const ex = CX + (hx - CX) * expand
    const ey = CY + (hy - CY) * expand
    pos[d] = [ex, ey]
    r[d] = baseR * decay * 0.85
  })
  return { pos, r }
}

// SINE — clean single sine wave scrolling continuously L→R
export function modeSine(t, baseR, now) {
  const pos = {}; const r = {}
  const amp = 30
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    // single clean frequency scrolling left to right
    const y = CY + amp * Math.sin((xNorm * 2 - time * 0.6) * Math.PI * 2)
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// STANDING WAVE — wave pulses in place, amplitude breathes, nodes stay fixed
export function modeStandingWave(t, baseR) {
  const pos = {}; const r = {}
  const maxAmp = 32
  // amplitude envelope: full sine pulse, so it swings positive then negative
  const amp = maxAmp * Math.sin(t * Math.PI * 2)
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    // spatial sine — fixed in space, only amplitude changes over time
    const y = CY + amp * Math.sin(xNorm * Math.PI * 2)
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// ─── SINE VARIATIONS ──────────────────────────────────────────────────────────

// LISSAJOUS — dots orbit a figure-8 path (x=sin(2t), y=sin(3t))
export function modeLissajous(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const rx = 36, ry = 28
  DOTS.forEach((d, i) => {
    const offset = (i / DOTS.length) * Math.PI * 2
    const angle = time * 0.8 + offset
    const x = CX + rx * Math.sin(angle * 2)
    const y = CY + ry * Math.sin(angle * 3)
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// BREATHING SINE — scrolling wave whose amplitude slowly inhales/exhales
export function modeBreathingSine(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const amp = 30 * (0.3 + 0.7 * Math.abs(Math.sin(time * 0.25 * Math.PI)))
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const y = CY + amp * Math.sin((xNorm * 2 - time * 0.55) * Math.PI * 2)
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// SAWTOOTH — asymmetric wave, fast rise slow fall
export function modeSawtooth(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const phase = ((xNorm * 1.5 - time * 0.5) % 1 + 1) % 1
    // sawtooth: linear ramp 0→1 then instant drop
    const saw = phase < 0.8 ? phase / 0.8 : (1 - phase) / 0.2
    const y = CY + (saw - 0.5) * 56
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// PHASE SHIFT — 7 dots same freq, each offset in phase, cascading shimmer
export function modePhaseShift(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx] = HOME[d]
    const phase = (i / DOTS.length) * Math.PI * 2
    const y = CY + 30 * Math.sin(t * Math.PI * 2 + phase)
    pos[d] = [hx, y]
    r[d] = baseR
  })
  return { pos, r }
}

// SNAKE — dots fixed across x, 1 full sine cycle scrolls through them
export function modeSnake(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const amp = 32
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const x = SPAN_MIN + xNorm * (SPAN_MAX - SPAN_MIN)
    const y = CY + amp * Math.sin((xNorm - time * 0.4) * Math.PI * 2)
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// ─── EQ / WAVE MODES (time-driven) ────────────────────────────────────────────

// EQ BARS — each band frequency is a rational multiple so all bands complete cleanly
export function modeEQBars(t, baseR) {
  const pos = {}; const r = {}
  // integer freqs ensure each band loops cleanly at t=1
  const freqs =  [1, 2, 3, 4, 3, 2, 1]
  const phases = [0, 0.25, 0.1, 0.5, 0.7, 0.15, 0.4]
  DOTS.forEach((d,i) => {
    const level = 0.3 + 0.7 * Math.abs(Math.sin((t * freqs[i] + phases[i]) * Math.PI * 2))
    const y = (CY + 22) - level * 44
    pos[d] = [BAR_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

const WF_LAG = (1 / (DOTS.length - 1)) * 0.38

// WAVE SIMPLE — single clean hill and valley, pure fundamental only
export function modeWaveSimple(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2)
    pos[d] = [BAR_XS[i], CY + amp * 34]
    r[d] = baseR
  })
  return { pos, r }
}

// WAVE DOUBLE — two clean hills per loop, no extra harmonics, just double freq
export function modeWaveDouble(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2 * 2)
    pos[d] = [BAR_XS[i], CY + amp * 30]
    r[d] = baseR
  })
  return { pos, r }
}

// WAVE DRIFT — two waves scrolling at slightly different speeds, phase relationship drifts
export function modeWaveDrift(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2 * 1) * 0.6
             + Math.sin(s * Math.PI * 2 * 3) * 0.4
    pos[d] = [BAR_XS[i], CY + amp * 28]
    r[d] = baseR
  })
  return { pos, r }
}

// ORBIT PULSE — orbit speed and radius both driven by integer-period functions
export function modeOrbitPulse(t, baseR) {
  const pos = {}; const r = {}
  // radius pulses once per loop cleanly
  const amp = 0.5 + 0.5 * Math.sin(t * Math.PI * 2)
  const minRad = 12, maxRad = 40
  const radius = minRad + amp * (maxRad - minRad)
  // orbit completes exactly 1 revolution per loop
  CW.forEach((d, i) => {
    const angle = (i / CW.length) * Math.PI * 2 + t * Math.PI * 2
    pos[d] = [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)]
    r[d] = baseR
  })
  pos["cn"] = [CX, CY]
  r["cn"] = baseR
  return { pos, r }
}


// SPIRAL — dots trace expanding spiral outward then contract back
export function modeSpiral(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx, hy] = HOME[d]
    // each dot gets a phase offset around the spiral
    const offset = (i / DOTS.length) * Math.PI * 2
    const angle  = t * Math.PI * 4 + offset  // 2 full rotations per loop
    // radius pulses out and back
    const rad = 28 * Math.sin(t * Math.PI)
    const tx = CX + rad * Math.cos(angle)
    const ty = CY + rad * Math.sin(angle)
    // blend from home to spiral and back
    let blend
    if (t < 0.15)      blend = easeInOut(t / 0.15)
    else if (t < 0.85) blend = 1
    else               blend = easeInOut(1 - (t - 0.85) / 0.15)
    pos[d] = [hx + (tx - hx) * blend, hy + (ty - hy) * blend]
    r[d] = baseR
  })
  return { pos, r }
}

// RELAY — each dot swells in sequence, passing the "baton" around the ring
export function modeRelay(t, baseR) {
  const n = CW.length
  const pos = { ...HOME }; const r = {}
  CW.forEach((d, i) => {
    const phase = (t - i / n + 1) % 1
    const swell = Math.max(0, Math.sin(phase * Math.PI * n) )
    r[d] = baseR * (1 + swell * 0.8)
  })
  r["cn"] = baseR
  return { pos, r }
}


// DRUNK — slow independent lazy wandering, smoother/slower than scatter
const DRUNK_PARAMS = DOTS.map((_, i) => ({
  fx: 0.3 + (i % 3) * 0.11,
  fy: 0.37 + (i % 4) * 0.09,
  px: i * 0.137,
  py: i * 0.241,
  amp: 8 + (i % 3) * 3,
}))
export function modeDrunk(t, baseR, now) {
  const time = now ?? t
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx, hy] = HOME[d]
    const { fx, fy, px, py, amp } = DRUNK_PARAMS[i]
    pos[d] = [
      hx + amp * Math.sin((time * fx + px) * Math.PI * 2),
      hy + amp * Math.sin((time * fy + py) * Math.PI * 2),
    ]
    r[d] = baseR
  })
  return { pos, r }
}

// ─── SHAPE-PLAY MODES ─────────────────────────────────────────────────────────
// Each keeps every dot inside the frame and matches itself at t = 0 and t = 1.

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const lerp = (a, b, k) => a + (b - a) * k

// Ease with a small overshoot, so a bud "snaps" past its spot and settles
function easeOutBack(x, s = 1.3) {
  const p = x - 1
  return 1 + (s + 1) * p * p * p + s * p * p
}

// ─── BUDDING ──────────────────────────────────────────────────────────────────
// All dots start merged at the center; the six outer dots pinch off one at a
// time clockwise (the goo filter draws the stretching neck), then get pulled
// back in together. The center blob shrinks as buds leave it.
const BUD_ORDER = ["tc", "rt", "rb", "bc", "lb", "lt"]
export function modeBudding(t, baseR) {
  const pos = { cn: [CX, CY] }; const r = {}
  const retract = easeInOut(clamp01((t - 0.78) / 0.17)) // 0.78 → 0.95
  let stillMerged = 0
  BUD_ORDER.forEach((d, i) => {
    const start = 0.06 + i * 0.08
    const out = clamp01((t - start) / 0.16)
    const k = easeOutBack(out) * (1 - retract)
    const [hx, hy] = HOME[d]
    pos[d] = [lerp(CX, hx, k), lerp(CY, hy, k)]
    r[d] = baseR
    stillMerged += 1 - Math.min(1, k)
  })
  r.cn = baseR * (1 + 0.5 * (stillMerged / BUD_ORDER.length))
  return { pos, r }
}

// ─── CUBE TUMBLE ──────────────────────────────────────────────────────────────
// Real 3D quarter turn about the vertical axis. The top face's 4 corners ride an
// ellipse around (CX, 50); the bottom face's visible corners ride one around
// (CX, 90). Angles: right 0°, back 90°, left 180°, front 270°.
// The bottom face has 4 corners but only 3 dots — the one that rotates to the
// back keeps travelling behind the cube (shrunk to nothing while hidden) and
// reappears on the far side, so the hidden corner is never needed on screen.
const TOP_RING = { rt: 0, tc: 90, lt: 180, cn: 270 }
const BOTTOM_RING = { rb: 0, lb: 180, bc: 270 }
const RING = { rx: 40, ry: 20, topY: 50, bottomY: 90 }
const ringPoint = (deg, cy) => {
  const a = (deg * Math.PI) / 180
  return [CX + RING.rx * Math.cos(a), cy - RING.ry * Math.sin(a)]
}
export function modeCubeTumble(t, baseR) {
  const p = easeInOut(clamp01(t / 0.6)) // turn during 0–0.6, hold the rest
  const motion = Math.sin(Math.PI * p)  // depth cue only while moving
  const pos = {}; const r = {}
  for (const [d, a0] of Object.entries(TOP_RING)) {
    const a = a0 + 90 * p
    pos[d] = ringPoint(a, RING.topY)
    // nearer (front) corners swell slightly, far ones shrink, mid-turn only
    r[d] = baseR * (1 - 0.18 * Math.sin((a * Math.PI) / 180) * motion)
  }
  for (const [d, a0] of Object.entries(BOTTOM_RING)) {
    const travel = d === "rb" ? 180 : 90 // the dot that goes round the back
    const a = a0 + travel * p
    pos[d] = ringPoint(a, RING.bottomY)
    const s = Math.sin((a * Math.PI) / 180) // > 0 means behind the cube
    r[d] = s > 0
      ? baseR * clamp01(1 - s * 2.2)
      : baseR * (1 - 0.18 * s * motion)
  }
  return { pos, r }
}

// ─── LAVA LAMP ────────────────────────────────────────────────────────────────
// Dots keep their three columns but rise and fall at offset phases, so dots in
// the same column pass through each other and the goo merges and splits them.
// Integer frequencies keep the loop exact; lower Speed for a calmer lamp.
const LAVA = {
  tc: { phase: 0.00, sway: 0.25 }, cn: { phase: 0.36, sway: 0.70 }, bc: { phase: 0.68, sway: 0.10 },
  lt: { phase: 0.15, sway: 0.55 }, lb: { phase: 0.62, sway: 0.90 },
  rt: { phase: 0.45, sway: 0.40 }, rb: { phase: 0.88, sway: 0.05 },
}
export function modeLavaLamp(t, baseR) {
  const pos = {}; const r = {}
  for (const d of DOTS) {
    const { phase, sway } = LAVA[d]
    const lift = Math.sin(2 * Math.PI * (t + phase))
    const y = CY + 34 * lift
    const x = HOME[d][0] + 7 * Math.sin(2 * Math.PI * (t + sway))
    pos[d] = [x, y]
    // warmer (lower) blobs are a little bigger, cooler (higher) ones smaller
    r[d] = baseR * (1 + 0.15 * lift)
  }
  return { pos, r }
}

// ─── CENTER SWAP ──────────────────────────────────────────────────────────────
// The logo stays intact; the center dot trades places with each ring dot in
// turn, clockwise. The pair pass around each other on slight opposite arcs,
// and the goo fuses them as they cross. All dots stay full size.
const SWAP_RING = ["tc", "rt", "rb", "bc", "lb", "lt"]
export function modeCenterSwap(t, baseR) {
  const pos = {}; const r = uniformRadii(baseR)
  // Walk the swaps completed before this one to find who sits where
  const slotOf = Object.fromEntries(DOTS.map(d => [d, d])) // dot → home slot
  let center = "cn"
  const k = Math.min(5, Math.floor(t * 6))
  for (let i = 0; i < k; i++) {
    const ringDot = DOTS.find(d => slotOf[d] === SWAP_RING[i])
    slotOf[center] = SWAP_RING[i]; slotOf[ringDot] = "cn"; center = ringDot
  }
  const target = SWAP_RING[k]
  const outgoing = DOTS.find(d => slotOf[d] === target)
  const e = easeInOut(clamp01(((t * 6) % 1) / 0.6)) // swap over 60% of its slot
  for (const d of DOTS) pos[d] = [...HOME[slotOf[d]]]
  const [sx, sy] = HOME[target]
  const nx = -(sy - CY), ny = sx - CX // perpendicular, for the arcs
  const len = Math.hypot(nx, ny) || 1
  const bow = 9 * Math.sin(Math.PI * e)
  pos[center] = [lerp(CX, sx, e) + (nx / len) * bow, lerp(CY, sy, e) + (ny / len) * bow]
  pos[outgoing] = [lerp(sx, CX, e) - (nx / len) * bow, lerp(sy, CY, e) - (ny / len) * bow]
  return { pos, r }
}

// ─── RICOCHET ─────────────────────────────────────────────────────────────────
// The ring holds still while the center dot bounces around inside it, striking
// six ring dots in a star pattern. Each struck dot recoils outward and settles.
// All dots stay full size.
const HIT_ORDER = ["tc", "rb", "lb", "rt", "bc", "lt"]
function contactPoint(d, baseR) {
  const [hx, hy] = HOME[d]
  const dx = CX - hx, dy = CY - hy, len = Math.hypot(dx, dy)
  const reach = baseR * 1.8 // just touching, slight overlap so the goo fuses
  return [hx + (dx / len) * reach, hy + (dy / len) * reach]
}
export function modeRicochet(t, baseR) {
  const pos = {}; const r = uniformRadii(baseR)
  const seg = t * 6
  const k = Math.min(5, Math.floor(seg))
  const from = contactPoint(HIT_ORDER[k], baseR)
  const to = contactPoint(HIT_ORDER[(k + 1) % 6], baseR)
  const p = seg - k // straight, even-speed flight between strikes
  pos.cn = [lerp(from[0], to[0], p), lerp(from[1], to[1], p)]
  HIT_ORDER.forEach((d, i) => {
    const since = (((t - i / 6) % 1) + 1) % 1 // time since this dot was struck
    const kick = since < 0.09 ? 7 * Math.sin(Math.PI * since / 0.09) : 0
    const [hx, hy] = HOME[d]
    const dx = hx - CX, dy = hy - CY, len = Math.hypot(dx, dy)
    pos[d] = [hx + (dx / len) * kick, hy + (dy / len) * kick]
  })
  return { pos, r }
}

// ─── TYPING ───────────────────────────────────────────────────────────────────
// The logo's three columns fold down into three blobs in a row — the familiar
// "someone is typing…" indicator — which bounce in sequence twice, then unfold
// back into the logo. Every dot stays full size; the goo fuses each column.
const COLUMNS = [["lt", "lb"], ["tc", "cn", "bc"], ["rt", "rb"]]
export function modeTyping(t, baseR) {
  const pos = {}; const r = uniformRadii(baseR)
  const fold = easeInOut(clamp01(t / 0.14)) * (1 - easeInOut(clamp01((t - 0.82) / 0.14)))
  COLUMNS.forEach((col, i) => {
    let hop = 0
    for (let c = 0; c < 2; c++) {
      const k = clamp01((t - (0.2 + c * 0.28 + i * 0.07)) / 0.12)
      hop += 13 * Math.sin(Math.PI * k)
    }
    for (const d of col) {
      const [hx, hy] = HOME[d]
      pos[d] = [hx, lerp(hy, CY, fold) - hop * fold]
    }
  })
  return { pos, r }
}
