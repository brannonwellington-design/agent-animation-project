import { useEffect, useRef, useCallback, useState } from "react"

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  canvas:   "#f9f4eb",
  ink:      "#120F08",
  inkSecondary: "rgba(18,15,8,0.6)",
  accent:   "#0021cc",
  border:   "rgba(18,15,8,0.12)",
}

// ─── Icon internals ───────────────────────────────────────────────────────────
const PAD = 24
const HOME = {
  tc: [46+PAD, 6+PAD], lt: [6+PAD, 26+PAD], rt: [86+PAD, 26+PAD],
  cn: [46+PAD, 46+PAD], lb: [6+PAD, 66+PAD], rb: [86+PAD, 66+PAD], bc: [46+PAD, 86+PAD],
}
const VB = 92 + PAD * 2
const DOTS = ["tc","lt","rt","cn","lb","rb","bc"]
const CW   = ["tc","rt","rb","bc","lb","lt"]

function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }
function easeOut(t)   { return 1 - Math.pow(1-t, 3) }

// Find optimal dot assignment: maps each current dot to the nearest target slot
// Uses greedy nearest-neighbor (good enough for 7 dots, avoids O(n!) brute force)
function findBestRemap(currentPos, targetPos) {
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

function modeStatic(t, r)  { return { pos:{...HOME}, r:Object.fromEntries(DOTS.map(d=>[d,r])) } }

function modeBreathe(t, baseR) {
  const scale = 1 + 0.45 * Math.sin(t * Math.PI * 2)
  const pos = {}; const r = {}
  for (const d of DOTS) {
    const [hx,hy] = HOME[d]
    pos[d] = [46+PAD+(hx-46-PAD)*scale, 46+PAD+(hy-46-PAD)*scale]
    r[d] = baseR
  }
  return { pos, r }
}

function modeFaceSimple(t, baseR, slots) {
  const step = Math.floor(t*4)%4
  const ease = easeInOut(Math.min(((t*4)%1)/0.6,1))
  const pos = {...HOME}; const r = Object.fromEntries(DOTS.map(d=>[d,baseR]))
  for (let i=0; i<4; i++) {
    const dotIdx = ((i-step)%4+4)%4
    const dot = slots[dotIdx]
    const prevSlot = slots[((dotIdx-1)%4+4)%4]
    const [x1,y1] = HOME[prevSlot]; const [x2,y2] = HOME[slots[dotIdx]]
    pos[dot] = [x1+(x2-x1)*ease, y1+(y2-y1)*ease]
  }
  return { pos, r }
}

const AF_STATES = [
  {tc:[46+PAD,6+PAD],lt:[6+PAD,26+PAD],rt:[86+PAD,26+PAD],cn:[46+PAD,46+PAD],lb:[6+PAD,66+PAD],rb:[86+PAD,66+PAD],bc:[46+PAD,86+PAD]},
  {tc:[86+PAD,26+PAD],lt:[46+PAD,6+PAD],rt:[46+PAD,46+PAD],cn:[6+PAD,26+PAD],lb:[6+PAD,66+PAD],rb:[86+PAD,66+PAD],bc:[46+PAD,86+PAD]},
  {tc:[86+PAD,66+PAD],lt:[46+PAD,6+PAD],rt:[86+PAD,26+PAD],cn:[6+PAD,26+PAD],lb:[6+PAD,66+PAD],rb:[46+PAD,86+PAD],bc:[46+PAD,46+PAD]},
  {tc:[46+PAD,86+PAD],lt:[46+PAD,6+PAD],rt:[86+PAD,26+PAD],cn:[6+PAD,26+PAD],lb:[46+PAD,46+PAD],rb:[6+PAD,66+PAD],bc:[86+PAD,66+PAD]},
  {tc:[6+PAD,66+PAD],lt:[46+PAD,6+PAD],rt:[86+PAD,26+PAD],cn:[46+PAD,46+PAD],lb:[46+PAD,86+PAD],rb:[6+PAD,26+PAD],bc:[86+PAD,66+PAD]},
]

function modeAllFaces(t, baseR) {
  const phase = Math.min(Math.floor(t*4),3)
  const ease = easeInOut(Math.min(((t*4)%1)/0.6,1))
  const from = AF_STATES[phase]; const to = AF_STATES[phase+1]
  const pos = {}
  for (const d of DOTS) { const [x1,y1]=from[d],[x2,y2]=to[d]; pos[d]=[x1+(x2-x1)*ease,y1+(y2-y1)*ease] }
  return { pos, r: Object.fromEntries(DOTS.map(d=>[d,baseR])) }
}

function modeCombine(t, baseR) {
  let m = t<0.15?easeInOut(t/0.15):t<0.35?1:t<0.5?easeInOut(1-(t-0.35)/0.15):0
  const pos = {}
  for (const d of DOTS) { const [hx,hy]=HOME[d]; pos[d]=[hx+(46+PAD-hx)*m,hy+(46+PAD-hy)*m] }
  return { pos, r: Object.fromEntries(DOTS.map(d=>[d,baseR])) }
}

function modeRotate(t, baseR) {
  const step = Math.floor(t*6)%6
  const ease = easeInOut(Math.min(((t*6)%1)/0.6,1))
  const pos = {cn:[46+PAD,46+PAD]}
  for (let i=0;i<6;i++) {
    const [x1,y1]=HOME[CW[(i+step)%6]],[x2,y2]=HOME[CW[(i+step+1)%6]]
    pos[CW[i]]=[x1+(x2-x1)*ease,y1+(y2-y1)*ease]
  }
  return { pos, r: Object.fromEntries(DOTS.map(d=>[d,baseR])) }
}

function modePairSwap(t, baseR) {
  const pairs = [["tc","bc"],["lt","rb"],["rt","lb"]]
  const phase = Math.floor(t*3)%3
  const ease = easeInOut(Math.min(((t*3)%1)/0.6,1))
  const pos = {...HOME}; const r = Object.fromEntries(DOTS.map(d=>[d,baseR]))
  const [a,b] = pairs[phase]
  const [ax,ay]=HOME[a],[bx,by]=HOME[b]
  const arc = Math.sin(ease*Math.PI)*20
  const len = Math.hypot(bx-ax,by-ay)
  const nx=-(by-ay)/len, ny=(bx-ax)/len
  pos[a]=[ax+(bx-ax)*ease+nx*arc, ay+(by-ay)*ease+ny*arc]
  pos[b]=[bx+(ax-bx)*ease-nx*arc, by+(ay-by)*ease-ny*arc]
  return { pos, r }
}


function modeWave(t, baseR) {
  const pos = {...HOME}; const r = {}
  for (let i=0;i<6;i++) {
    const phase = (t - i/6 + 1)%1
    r[CW[i]] = baseR * (1 + 0.8*Math.max(0,Math.sin(phase*Math.PI*2)))
  }
  r["cn"] = baseR*(1+0.5*Math.sin(t*Math.PI*2))
  return { pos, r }
}

function modeTypewriter(t, baseR) {
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

function modeSplit(t, baseR) {
  const step=Math.floor(t*3)%3; const ease=easeInOut(Math.min(((t*3)%1)/0.6,1))
  const cwG=["tc","rb","lb"], ccwG=["rt","bc","lt"]
  const cwT=[["tc","rb","lb"],["rb","lb","tc"],["lb","tc","rb"]]
  const ccwT=[["rt","bc","lt"],["lt","rt","bc"],["bc","lt","rt"]]
  const pos={cn:[46+PAD,46+PAD]}; const r=Object.fromEntries(DOTS.map(d=>[d,baseR]))
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
  [46+PAD, 10+PAD],   // top
  [12+PAD, 72+PAD],   // bottom-left
  [80+PAD, 72+PAD],   // bottom-right
]
function modeTriangle(t, baseR) {
  // phase 0→0.3: collapse to triangle, 0.3→0.7: hold+spin, 0.7→1: open back
  let blend
  if (t < 0.25) blend = easeInOut(t / 0.25)
  else if (t < 0.75) blend = 1
  else blend = easeInOut(1 - (t - 0.75) / 0.25)
  // rotate the triangle target positions over time
  const spin = t * Math.PI * 2
  const cx = 46+PAD, cy = 46+PAD
  const rotTri = TRI.map(([px,py]) => {
    const dx=px-cx, dy=py-cy
    return [cx + dx*Math.cos(spin) - dy*Math.sin(spin), cy + dx*Math.sin(spin) + dy*Math.cos(spin)]
  })
  const targets = [rotTri[0], rotTri[1], rotTri[2], rotTri[0], rotTri[1], rotTri[2], [cx,cy]]
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
function modeArrow(t, baseR) {
  const arm = 36 * (1 + 0.25 * Math.sin(t * Math.PI * 2))
  const cx = 46+PAD, cy = 46+PAD
  const targets = {
    tc: [cx, cy - arm], bc: [cx, cy + arm],
    lt: [cx - arm, cy], rt: [cx + arm, cy],
    cn: [cx, cy],
    lb: [cx - arm * 0.5, cy + arm * 0.5],
    rb: [cx + arm * 0.5, cy + arm * 0.5],
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
const S_MIN = 14 + PAD, S_MAX = 78 + PAD
function modeScatter(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const { bx, by, px, py } = SCATTER_PARAMS[i]
    // triangle wave with integer bounce count — exactly periodic at t=1
    const tx = ((t + px) % 1)
    const ty = ((t + py) % 1)
    const x = S_MIN + Math.abs(((tx * bx * 2) % 2) - 1) * (S_MAX - S_MIN)
    const y = S_MIN + Math.abs(((ty * by * 2) % 2) - 1) * (S_MAX - S_MIN)
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// CHAOS: Gravity — dots fall to a floor staggered, squish, bounce back
function modeGravity(t, baseR) {
  const floor = 82+PAD
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
function modeMetronome(t, baseR) {
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
function modeMorse(t, baseR) {
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
function modeChase(t, baseR) {
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
function modeFlock(t, baseR) {
  // centroid wanders in a figure-8
  const cx = 46+PAD + 22*Math.sin(t*Math.PI*2)
  const cy = 46+PAD + 14*Math.sin(t*Math.PI*4)
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

// ─── RECORD mode: radial microphone grille ────────────────────────────────────
// The 7 animatable dots collapse to center. A separate overlay renders the grille.
// We generate grille dot positions here so the overlay can use them.
const CX = 46+PAD, CY = 46+PAD
const GRILLE_DOTS = (() => {
  const dots = []
  // rings: radii and dot counts
  const rings = [
    { r: 0,  n: 1  },  // center
    { r: 12, n: 6  },
    { r: 22, n: 10 },
    { r: 32, n: 14 },
    { r: 42, n: 18 },
  ]
  rings.forEach(({ r, n }, ri) => {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      dots.push({
        x: CX + r * Math.cos(angle),
        y: CY + r * Math.sin(angle),
        ring: ri,
      })
    }
  })
  return dots
})()

// The 7 main dots all converge to center; the grille overlay handles visuals
function modeRecord(t, baseR) {
  const pos = {}; const r = {}
  for (const d of DOTS) {
    pos[d] = [CX, CY]
    r[d] = 0  // hidden — grille overlay takes over
  }
  return { pos, r }
}

// ─── AUDIO MODES ──────────────────────────────────────────────────────────────

// OSCILLOSCOPE — dots trace a morphing sine wave across the icon L→R, seamless
function modeOscilloscope(t, baseR, now) {
  const xs = [10, 24, 34, 46, 58, 68, 82].map(x => x + PAD)
  const pos = {}; const r = {}
  const cy = 46 + PAD
  const amp = 28
  // drive with raw `now` so the wave scrolls continuously with no reset jump
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const y = cy
      + amp * 0.65 * Math.sin((xNorm * 2.5 + time * 0.5) * Math.PI * 2)
      + amp * 0.35 * Math.sin((xNorm * 4.1 - time * 0.65) * Math.PI * 2)
    pos[d] = [xs[i], y]
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
function modeNoise(t, baseR) {
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


function modeStutter(t, baseR) {
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
function modeReverb(t, baseR) {
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
const SINE_XS = [10, 24, 34, 46, 58, 68, 82].map(x => x + PAD)
function modeSine(t, baseR, now) {
  const pos = {}; const r = {}
  const cy = 46 + PAD
  const amp = 30
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    // single clean frequency scrolling left to right
    const y = cy + amp * Math.sin((xNorm * 2 - time * 0.6) * Math.PI * 2)
    pos[d] = [SINE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// STANDING WAVE — wave pulses in place, amplitude breathes, nodes stay fixed
function modeStandingWave(t, baseR) {
  const pos = {}; const r = {}
  const cy = 46 + PAD
  const maxAmp = 32
  // amplitude envelope: full sine pulse, so it swings positive then negative
  const amp = maxAmp * Math.sin(t * Math.PI * 2)
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    // spatial sine — fixed in space, only amplitude changes over time
    const y = cy + amp * Math.sin(xNorm * Math.PI * 2)
    pos[d] = [SINE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// ─── SINE VARIATIONS ──────────────────────────────────────────────────────────
const WAVE_XS = [10, 24, 34, 46, 58, 68, 82].map(x => x + PAD)
const WCY = 46 + PAD

// LISSAJOUS — dots orbit a figure-8 path (x=sin(2t), y=sin(3t))
function modeLissajous(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const rx = 36, ry = 28
  DOTS.forEach((d, i) => {
    const offset = (i / DOTS.length) * Math.PI * 2
    const angle = time * 0.8 + offset
    const x = CX + rx * Math.sin(angle * 2)
    const y = WCY + ry * Math.sin(angle * 3)
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// BREATHING SINE — scrolling wave whose amplitude slowly inhales/exhales
function modeBreathingSine(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const amp = 30 * (0.3 + 0.7 * Math.abs(Math.sin(time * 0.25 * Math.PI)))
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const y = WCY + amp * Math.sin((xNorm * 2 - time * 0.55) * Math.PI * 2)
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// SAWTOOTH — asymmetric wave, fast rise slow fall
function modeSawtooth(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const phase = ((xNorm * 1.5 - time * 0.5) % 1 + 1) % 1
    // sawtooth: linear ramp 0→1 then instant drop
    const saw = phase < 0.8 ? phase / 0.8 : (1 - phase) / 0.2
    const y = WCY + (saw - 0.5) * 56
    pos[d] = [WAVE_XS[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// PHASE SHIFT — 7 dots same freq, each offset in phase, cascading shimmer
function modePhaseShift(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const [hx] = HOME[d]
    const phase = (i / DOTS.length) * Math.PI * 2
    const y = WCY + 30 * Math.sin(t * Math.PI * 2 + phase)
    pos[d] = [hx, y]
    r[d] = baseR
  })
  return { pos, r }
}

// SNAKE — dots fixed across x, 1 full sine cycle scrolls through them
function modeSnake(t, baseR, now) {
  const pos = {}; const r = {}
  const time = now ?? t
  const amp = 32
  const x0 = 14 + PAD, x1 = 78 + PAD
  DOTS.forEach((d, i) => {
    const xNorm = i / (DOTS.length - 1)
    const x = x0 + xNorm * (x1 - x0)
    const y = WCY + amp * Math.sin((xNorm - time * 0.4) * Math.PI * 2)
    pos[d] = [x, y]
    r[d] = baseR
  })
  return { pos, r }
}

// ─── AUDIO REACTIVE MODES ─────────────────────────────────────────────────────

// EQ BARS — each band frequency is a rational multiple so all bands complete cleanly
function modeEQBars(t, baseR) {
  const pos = {}; const r = {}
  const xs = [8,21,34,46,58,71,84].map(x=>x+PAD)
  // integer freqs ensure each band loops cleanly at t=1
  const freqs =  [1, 2, 3, 4, 3, 2, 1]
  const phases = [0, 0.25, 0.1, 0.5, 0.7, 0.15, 0.4]
  DOTS.forEach((d,i) => {
    const level = 0.3 + 0.7 * Math.abs(Math.sin((t * freqs[i] + phases[i]) * Math.PI * 2))
    const y = (WCY + 22) - level * 44
    pos[d] = [xs[i], y]
    r[d] = baseR
  })
  return { pos, r }
}

// shared helper — same scrolling-sample mechanism
const WF_XS = [8,21,34,46,58,71,84].map(x=>x+PAD)
const WF_LAG = (1 / (DOTS.length - 1)) * 0.38

// WAVE SIMPLE — single clean hill and valley, pure fundamental only
function modeWaveSimple(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2)
    pos[d] = [WF_XS[i], WCY + amp * 34]
    r[d] = baseR
  })
  return { pos, r }
}

// WAVE DOUBLE — two clean hills per loop, no extra harmonics, just double freq
function modeWaveDouble(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2 * 2)
    pos[d] = [WF_XS[i], WCY + amp * 30]
    r[d] = baseR
  })
  return { pos, r }
}

// WAVE DRIFT — two waves scrolling at slightly different speeds, phase relationship drifts
function modeWaveDrift(t, baseR) {
  const pos = {}; const r = {}
  DOTS.forEach((d, i) => {
    const s = t - (DOTS.length - 1 - i) * WF_LAG
    const amp = Math.sin(s * Math.PI * 2 * 1) * 0.6
             + Math.sin(s * Math.PI * 2 * 3) * 0.4
    pos[d] = [WF_XS[i], WCY + amp * 28]
    r[d] = baseR
  })
  return { pos, r }
}

// ORBIT PULSE — orbit speed and radius both driven by integer-period functions
function modeOrbitPulse(t, baseR) {
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
function modeSpiral(t, baseR) {
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
function modeRelay(t, baseR) {
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
function modeDrunk(t, baseR, now) {
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


// ─── Lucide icon path data (24×24 viewBox, stroke-only) ──────────────────────
// Scale factor to fit 24×24 into our VB (140): translate+scale so icon is centered at CX,CY
// We'll apply transform="translate(CX-12*S, CY-12*S) scale(S)" where S≈3.3
const LUCIDE_ICONS = {
  mic: {
    label: "Mic",
    paths: [
      "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z",
      "M19 10v2a7 7 0 0 1-14 0v-2",
      "M12 19v3",
      "M8 22h8",
    ],
  },
  headphones: {
    label: "Headphones",
    paths: [
      "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",
    ],
  },
  brain: {
    label: "Brain",
    paths: [
      "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
      "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
      "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4",
      "M17.599 6.5a3 3 0 0 0 .399-1.375",
      "M6.003 5.125A3 3 0 0 0 6.401 6.5",
      "M3.477 10.896a4 4 0 0 1 .585-.396",
      "M19.938 10.5a4 4 0 0 1 .585.396",
      "M6 18a4 4 0 0 1-1.967-.516",
      "M19.967 17.484A4 4 0 0 1 18 18",
    ],
  },
  ear: {
    label: "Ear",
    paths: [
      "M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 0 1-7 0",
      "M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4",
    ],
  },
  volume2: {
    label: "Volume",
    paths: [
      "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      "M16 9a5 5 0 0 1 0 6",
      "M19.364 18.364a9 9 0 0 0 0-12.728",
    ],
  },
"message-circle": {
    label: "Message",
    paths: [
      "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
    ],
  },
  "audio-waveform": {
    label: "Waveform",
    paths: [
      "M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 0-2-2",
    ],
  },
  // ── Document ──
  "file-text": {
    label: "File Text",
    paths: [
      "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      "M14 2v4a2 2 0 0 0 2 2h4",
      "M10 9H8", "M16 13H8", "M16 17H8",
    ],
  },
  "notebook": {
    label: "Notebook",
    paths: [
      "M2 6h4", "M2 10h4", "M2 14h4", "M2 18h4",
      "M6 2v20",
      "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6",
    ],
  },
  "book-open": {
    label: "Book",
    paths: [
      "M12 7v14",
      "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
    ],
  },
  "clipboard": {
    label: "Clipboard",
    paths: [
      "M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
      "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2",
    ],
  },
  // ── Data ──
  "bar-chart-2": {
    label: "Bar Chart",
    paths: [
      "M18 20V10", "M12 20V4", "M6 20v-6",
    ],
  },
  "chart-line": {
    label: "Line Chart",
    paths: [
      "M3 3v16a2 2 0 0 0 2 2h16",
      "m19 9-5 5-4-4-3 3",
    ],
  },
  "database": {
    label: "Database",
    paths: [
      "M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4z",
      "M2 6c0 2.21 4.48 4 10 4s10-1.79 10-4",
      "M2 12c0 2.21 4.48 4 10 4s10-1.79 10-4",
    ],
  },
  "search": {
    label: "Search",
    paths: [
      "M21 21l-4.35-4.35",
      "M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    ],
  },
  // ── Media ──
  "play-circle": {
    label: "Play",
    paths: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      "M10 8l6 4-6 4V8z",
    ],
  },
  "video": {
    label: "Video",
    paths: [
      "M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14v-4z",
      "M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z",
    ],
  },
  "image": {
    label: "Image",
    paths: [
      "M15 8h.01",
      "M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z",
      "M3 16l5-5 4 4 3-3 4 4",
    ],
  },
  "music": {
    label: "Music",
    paths: [
      "M9 18V5l12-2v13",
      "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
      "M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    ],
  },
  "podcast": {
    label: "Podcast",
    paths: [
      "M16.85 18.58a9 9 0 1 0-9.7 0",
      "M8 14a5 5 0 1 1 8 0",
      "M12 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
      "M12 14v7",
    ],
  },
}

// MORPH — forward: dots converge → quiver → icon grows out of blob
//          reverse: icon shrinks back → quiver → dots expand home (seamless ping-pong loop)
// t folds at 0.5: second half mirrors first half exactly in reverse
function modeMorph(t, baseR, _now, mt) {
  mt = mt || { convergeEnd:0.35, blobShrink:0.35, crossEnd:0.80 }
  // Fold t: 0→0.5 = forward, 0.5→1 = reverse
  const tf = t < 0.5 ? t * 2 : (1 - t) * 2  // 0→1→0 over full loop

  const convergeEnd = mt.convergeEnd
  const crossStart  = mt.blobShrink
  const crossEnd    = mt.crossEnd

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


const MODES = {
  static:modeStatic, breathe:modeBreathe,
  topFace:(t,r)=>modeFaceSimple(t,r,["tc","rt","cn","lt"]),
  leftFace:(t,r)=>modeFaceSimple(t,r,["lt","cn","bc","lb"]),
  rightFace:(t,r)=>modeFaceSimple(t,r,["rt","rb","bc","cn"]),
  bottomFace:(t,r)=>modeFaceSimple(t,r,["bc","lb","cn","rb"]),
  allFaces:modeAllFaces, combine:modeCombine, rotate:modeRotate,
  pairSwap:modePairSwap, wave:modeWave,
  typewriter:modeTypewriter, split:modeSplit,
  triangle:modeTriangle, arrow:modeArrow,
  scatter:modeScatter, gravity:modeGravity,
  metronome:modeMetronome, morse:modeMorse,
  chase:modeChase, flock:modeFlock,
  record:modeRecord,
  oscilloscope:modeOscilloscope, noise:modeNoise,
  stutter:modeStutter, reverb:modeReverb,
  sine:modeSine, standingWave:modeStandingWave,
  lissajous:modeLissajous, breathingSine:modeBreathingSine,
  sawtooth:modeSawtooth, phaseShift:modePhaseShift,
  snake:modeSnake,
  eqBars:modeEQBars,
  waveSimple:modeWaveSimple,
  waveDouble:modeWaveDouble,
  waveDrift:modeWaveDrift,
  orbitPulse:modeOrbitPulse,
  spiral:modeSpiral,
  relay:modeRelay,
  drunk:modeDrunk,
  morph:modeMorph,
}

const MODE_LABELS = {
  static:"Static", breathe:"Breathe", topFace:"Top Face", leftFace:"Left Face",
  rightFace:"Right Face", bottomFace:"Bottom Face", allFaces:"All Faces",
  combine:"Combine", rotate:"Rotate", pairSwap:"Pair Swap",
  wave:"Wave", typewriter:"Typewriter", split:"Split",
  triangle:"Triangle", arrow:"Arrow",
  scatter:"Scatter", gravity:"Gravity",
  metronome:"Metronome", morse:"Morse",
  chase:"Chase", flock:"Flock",
  record:"Record",
  oscilloscope:"Oscilloscope", noise:"Noise",
  stutter:"Stutter", reverb:"Reverb",
  sine:"Sine", standingWave:"Standing Wave",
  lissajous:"Lissajous", breathingSine:"Breathing Sine",
  sawtooth:"Sawtooth", phaseShift:"Phase Shift",
  snake:"Snake",
  eqBars:"EQ Bars",
  waveSimple:"Wave Simple",
  waveDouble:"Wave Double",
  waveDrift:"Wave Drift",
  orbitPulse:"Orbit Pulse",
  spiral:"Spiral",
  relay:"Relay",
  drunk:"Drunk",
  morph:"Morph →",
}

// Modes that use real-time `now` — need live targets during transitions
const REALTIME_MODES = new Set(["oscilloscope","sine","lissajous","breathingSine","sawtooth","snake","drunk"])

// ─── Icon component ───────────────────────────────────────────────────────────
function ListenLabsIcon({ mode="breathe", speed=2, dotRadius=8, color=B.accent, size=92, transitionDuration=0.4, audioLevelRef=null, audioMode="off", selectedIcon="mic", iconStrokeWidth=5, morphTimeline=null, cycleAll=false, setSelectedIcon=null }) {
  const svgRef = useRef(null)
  const s = useRef({ mode, speed, dotRadius, color, fromPositions:null, fromRadii:null, transitionStart:null, transitionDuration, loopStart:null, rafId:0 })

  s.current.speed = speed
  s.current.dotRadius = dotRadius
  s.current.transitionDuration = transitionDuration
  s.current.color = color
  s.current.audioMode = audioMode
  s.current.audioLevelRef = audioLevelRef
  s.current.mode_for_icon = mode
  s.current.morphTimeline = morphTimeline
  s.current.iconStrokeWidth = iconStrokeWidth
  s.current.cycleAll = cycleAll
  s.current.setSelectedIcon = setSelectedIcon
  s.current.currentIconKey = selectedIcon

  useEffect(() => {
    if (s.current.mode !== mode) {
      const svg = svgRef.current
      if (svg) {
        const snap = {}; const snapR = {}
        for (const d of DOTS) {
          const el = svg.querySelector(`.d-${d}`)
          if (el) { snap[d]=[parseFloat(el.getAttribute("cx")||"0"),parseFloat(el.getAttribute("cy")||"0")]; snapR[d]=parseFloat(el.getAttribute("r")||String(dotRadius)) }
        }
        // Compute where the NEW mode would be at the current loop phase
        const now = performance.now() / 1000
        const morphSpeed = mode === "morph" ? s.current.speed * 2 : s.current.speed
        const switchT = s.current.loopStart !== null ? ((now - s.current.loopStart) % morphSpeed) / morphSpeed : 0
        const newFn = MODES[mode] || modeStatic
        const { pos: toPos, r: toR } = newFn(switchT, s.current.dotRadius, now / s.current.speed, s.current.morphTimeline)

        // Find optimal dot remapping: which current dot is closest to which target slot
        const remap = findBestRemap(snap, toPos)

        s.current.fromPositions = snap
        s.current.fromRadii = snapR
        s.current.toPositions = toPos   // static target snapshot
        s.current.toRadii = toR
        s.current.dotRemap = remap      // remap[currentDot] = targetDot it should blend toward
        s.current.transitionStart = now
        s.current.switchT = switchT     // remember phase so loop resumes here
      }
      s.current.mode = mode
    }
  }, [mode])

  const tick = useCallback((ts) => {
    const st = s.current; const svg = svgRef.current
    if (!svg) return
    const now = ts/1000
    if (st.loopStart===null) st.loopStart=now
    const morphSpeed = st.mode === "morph" ? st.speed * 2 : st.speed
    const rawT = ((now-st.loopStart)%morphSpeed)/morphSpeed
    // Audio loop push: add level as a fraction of the loop period, wrapped 0–1
    const lvl = (st.audioLevelRef?.current ?? 0)
    const t = st.audioMode !== "off" ? (rawT + lvl * 0.35) % 1 : rawT
    const fn = MODES[st.mode]||modeStatic
    // Audio+ modulates dotRadius on top of base value
    const effectiveRadius = st.audioMode === "plus"
      ? st.dotRadius * (1 + lvl * 1.2)
      : st.dotRadius
    const { pos:tp, r:tr } = fn(t, effectiveRadius, now / st.speed, st.morphTimeline)
    let fp=tp, fr=tr
    if (st.fromPositions&&st.transitionStart!==null) {
      const tBlend = Math.min((now-st.transitionStart)/st.transitionDuration,1)
      const ease = easeInOut(tBlend)
      const bp={},br={}
      // Real-time modes (now-driven) use live targets; others use static snapshots
      const useStatic = !REALTIME_MODES.has(st.mode)
      const toPos = useStatic ? (st.toPositions || tp) : tp
      const toR   = useStatic ? (st.toRadii || tr) : tr
      const remap = useStatic ? (st.dotRemap || null) : null
      for (const d of DOTS) {
        const targetSlot = remap ? remap[d] : d
        const [fx,fy]=st.fromPositions[d],[tx,ty]=toPos[targetSlot]
        bp[d]=[fx+(tx-fx)*ease,fy+(ty-fy)*ease]
        br[d]=(st.fromRadii?.[d]??st.dotRadius)+(toR[targetSlot]-(st.fromRadii?.[d]??st.dotRadius))*ease
      }
      fp=bp; fr=br
      if (tBlend>=1) {
        // Resume loop from the same phase so there's no discontinuity
        st.loopStart = now - (st.switchT || 0) * morphSpeed
        st.fromPositions=null; st.fromRadii=null; st.toPositions=null; st.toRadii=null; st.dotRemap=null; st.transitionStart=null
      }
    }
    for (const d of DOTS) {
      const el = svg.querySelector(`.d-${d}`)
      if (el) { el.setAttribute("cx",fp[d][0].toFixed(2)); el.setAttribute("cy",fp[d][1].toFixed(2)); el.setAttribute("r",fr[d].toFixed(2)); el.setAttribute("fill",color) }
    }
    st.rafId = requestAnimationFrame(tick)
  }, [color])

  useEffect(() => {
    s.current.rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(s.current.rafId)
  }, [tick])

  const grilleRef = useRef(null)
  const grilleT = useRef(0)  // 0=hidden, 1=fully shown
  const iconOverlayRef = useRef(null)
  const iconCrispRef  = useRef(null)  // crisp copy outside goo filter, always sharp
  const blurRef = useRef(null)
  const iconScale = useRef(0)
  const quiverGRef = useRef(null)  // group of lobe circles for blob quiver
  const lastLoopIdx = useRef(-1)   // tracks loop count to detect completion

  // animate grille in/out based on mode
  useEffect(() => {
    let rafId
    const animate = (ts) => {
      const target = s.current.mode === "record" ? 1 : 0
      grilleT.current += (target - grilleT.current) * 0.06
      // snap to target to avoid asymptotic drift
      if (Math.abs(grilleT.current - target) < 0.005) grilleT.current = target
      const now = ts / 1000
      const g = grilleRef.current
      if (g) {
        const dots = g.querySelectorAll("circle")
        dots.forEach((el, i) => {
          const dot = GRILLE_DOTS[i]
          let targetR
          if (grilleT.current > 0.95) {
            // fully revealed — uniform size with subtle breath
            const speed = s.current.speed
            const breath = 1 + 0.06 * Math.sin(now * (1.1 / speed))
            targetR = s.current.dotRadius * 0.42 * breath
          } else {
            // staggered reveal animation
            const ringDelay = dot.ring * 0.14
            const localT = Math.max(0, Math.min(1, (grilleT.current - ringDelay) / (1 - ringDelay)))
            targetR = s.current.dotRadius * 0.42 * easeInOut(localT)
          }
          el.setAttribute("r", targetR.toFixed(2))
          el.setAttribute("fill", s.current.color || color)
        })
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [mode])

  // Animate icon scale — mirrors the blob shrink: 0→1 during crossfade, holds at 1
  useEffect(() => {
    let rafId
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const st = s.current
      const overlay = iconOverlayRef.current
      if (!overlay) return
      if (st.mode_for_icon !== "morph") {
        iconScale.current = 0
      } else {
        const now = performance.now() / 1000
        const morphSpeed = st.mode_for_icon === "morph" ? st.speed * 2 : st.speed
        const rawT = st.loopStart !== null ? ((now - st.loopStart) % morphSpeed) / morphSpeed : 0
        const lvl = st.audioLevelRef?.current ?? 0
        const t = st.audioMode !== "off" ? (rawT + lvl * 0.35) % 1 : rawT

        // Cycle icon at loop completion (when loop index increments)
        if (st.cycleAll && st.setSelectedIcon && st.loopStart !== null) {
          const loopIdx = Math.floor((now - st.loopStart) / (st.speed * 2))
          if (loopIdx !== lastLoopIdx.current) {
            lastLoopIdx.current = loopIdx
            const keys = Object.keys(LUCIDE_ICONS)
            const curIdx = keys.indexOf(st.currentIconKey ?? keys[0])
            let next
            do { next = Math.floor(Math.random() * keys.length) } while (next === curIdx && keys.length > 1)
            st.setSelectedIcon(keys[next])
          }
        }

        // Fold t for ping-pong: 0→0.5 = forward, 0.5→1 = reverse
        const tf = t < 0.5 ? t * 2 : (1 - t) * 2
        const mt = st.morphTimeline || { iconStart:0.25, crossEnd:0.80 }
        if (tf < mt.iconStart) {
          iconScale.current = 0
        } else if (tf < mt.crossEnd) {
          const x = (tf - mt.iconStart) / (mt.crossEnd - mt.iconStart)
          iconScale.current = easeInOut(x)
        } else {
          iconScale.current = 1  // hold at peak
        }
      }
      const sc = iconScale.current.toFixed(4)
      const transformVal = `translate(${CX}px, ${CY}px) scale(${sc})`
      overlay.style.transform = transformVal
      overlay.style.opacity = "1"
      // Keep crisp copy perfectly synced
      if (iconCrispRef.current) {
        iconCrispRef.current.style.transform = transformVal
      }
      // Dynamic stroke width: thick (blobStroke) when tiny/blob-like, thins to iconStrokeWidth at full scale
      const blobSW = st.morphTimeline?.blobStroke ?? 10
      const targetSW = st.iconStrokeWidth ?? 5
      const dynStroke = (blobSW - iconScale.current * (blobSW - targetSW)) / 2.8
      const overlayInner = overlay.querySelector("g")
      if (overlayInner) overlayInner.setAttribute("stroke-width", dynStroke.toFixed(3))
      const crispInner = iconCrispRef.current?.querySelector("g")
      if (crispInner) crispInner.setAttribute("stroke-width", dynStroke.toFixed(3))

      // Quiver: animate lobe circles to make blob feel alive before transformation
      // Active window: t=0.28→0.40 — peaks just before/as blob starts shrinking
      const qGroup = quiverGRef.current
      if (qGroup) {
        const now2 = performance.now() / 1000
        // quiver intensity: ramps up 0.28→0.34, ramps down 0.34→0.42
        let qIntensity = 0
        if (st.mode_for_icon === "morph") {
          const morphSpeed2 = st.speed * 2
          const nowT = st.loopStart !== null ? ((now2 - st.loopStart) % morphSpeed2) / morphSpeed2 : 0
          const qt = st.morphTimeline || { quiverStart:0.01, quiverPeak:0.40, quiverEnd:0.80 }
          // Fold nowT for ping-pong
          const nowTF = nowT < 0.5 ? nowT * 2 : (1 - nowT) * 2
          if (nowTF >= qt.quiverStart && nowTF < qt.quiverPeak) {
            qIntensity = easeInOut((nowTF - qt.quiverStart) / (qt.quiverPeak - qt.quiverStart))
          } else if (nowTF >= qt.quiverPeak && nowTF < qt.quiverEnd) {
            qIntensity = easeInOut(1 - (nowTF - qt.quiverPeak) / (qt.quiverEnd - qt.quiverPeak))
          }
        }
        const qt2 = st.morphTimeline || {}
        const cycles    = qt2.quiverCycles ?? 3
        const windowDur = Math.max(0.01, (qt2.quiverEnd ?? 0.42) - (qt2.quiverStart ?? 0.28))
        const loopSpeed = st.speed || 2
        // Base frequency: how many cycles fit in the quiver window
        const baseFreq  = cycles / (windowDur * loopSpeed)

        const lobes = qGroup.querySelectorAll("circle")
        lobes.forEach((lobe, i) => {
          // Each lobe uses 3 sine harmonics at irrational ratios on each axis independently
          // This produces unpredictable, never-repeating scatter-like wandering
          // Seed offsets per lobe so they're all out of phase with each other
          const seed = i * 2.399  // irrational offset between lobes
          const f = baseFreq * Math.PI * 2

          // X: sum of 3 harmonics at different irrational freq ratios
          const dx =
            Math.sin(now2 * f * 1.000 + seed * 1.0) * 0.50 +
            Math.sin(now2 * f * 1.618 + seed * 2.3) * 0.30 +
            Math.sin(now2 * f * 2.414 + seed * 0.7) * 0.20

          // Y: same structure but different irrational ratios so X and Y desync
          const dy =
            Math.sin(now2 * f * 1.303 + seed * 3.1) * 0.50 +
            Math.sin(now2 * f * 1.732 + seed * 1.5) * 0.30 +
            Math.sin(now2 * f * 2.718 + seed * 4.2) * 0.20

          const maxR   = [13, 10, 15, 9][i]  // max wander radius per lobe
          const lobeR  = [5, 4, 5, 3][i] * qIntensity
          lobe.setAttribute("cx", (CX + dx * maxR * qIntensity).toFixed(2))
          lobe.setAttribute("cy", (CY + dy * maxR * qIntensity).toFixed(2))
          lobe.setAttribute("r",  lobeR.toFixed(2))
        })
      }
      // Keep full goo blur during crossfade. Once icon hits full scale, quickly taper to 0.
      if (blurRef.current) {
        const sc = iconScale.current
        // Taper blur off as icon fully grows, restore as it shrinks back
        const taper = sc < 0.85 ? 0 : (sc - 0.85) / 0.15
        const blur = (4 * (1 - taper)).toFixed(3)
        blurRef.current.setAttribute("stdDeviation", blur)
      }
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [mode])

  return (
    <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} fill="none" style={{display:"block"}}>
      <defs>
        <filter id="ll-goo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
      </defs>
      {/* Grille overlay — outside goo filter to stay crisp, r=0 hides dots */}
      <g ref={grilleRef}>
        {GRILLE_DOTS.map((dot, i) => (
          <circle key={i} cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r="0" opacity="1" fill={color}/>
        ))}
      </g>
      {/* Goo group — dots AND icon overlay share this filter so icon emerges from blob */}
      <g filter="url(#ll-goo)">
        {DOTS.map(d=>(
          <circle key={d} className={`d-${d}`} cx={HOME[d][0]} cy={HOME[d][1]} r={dotRadius} fill={color}/>
        ))}
        {/* Quiver lobes — small orbiting circles that make the merged blob feel alive */}
        <g ref={quiverGRef}>
          <circle cx={CX} cy={CY} r="0" fill={color}/>
          <circle cx={CX} cy={CY} r="0" fill={color}/>
          <circle cx={CX} cy={CY} r="0" fill={color}/>
          <circle cx={CX} cy={CY} r="0" fill={color}/>
        </g>
        {/* Lucide icon — inside goo filter so strokes get the same goopy treatment */}
        {(() => {
          const icon = LUCIDE_ICONS[selectedIcon]
          if (!icon) return null
          const S = 2.8
          return (
            <g ref={iconOverlayRef}
              style={{ transform: `translate(${CX}px, ${CY}px) scale(0)`, transformOrigin: "0px 0px" }}
              stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <g transform={`translate(${-12 * S} ${-12 * S}) scale(${S})`}
                 strokeWidth={iconStrokeWidth / S}>
                {icon.paths.map((d, i) => <path key={i} d={d} />)}
              </g>
            </g>
          )
        })()}
      </g>
      {/* Crisp icon layer — outside goo filter, perfectly synced, always sharp edges */}
      {(() => {
        const icon = LUCIDE_ICONS[selectedIcon]
        if (!icon) return null
        const S = 2.8
        return (
          <g ref={iconCrispRef}
            style={{ transform: `translate(${CX}px, ${CY}px) scale(0)`, transformOrigin: "0px 0px" }}
            stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
            <g transform={`translate(${-12 * S} ${-12 * S}) scale(${S})`}
               strokeWidth={iconStrokeWidth / S}>
              {icon.paths.map((d, i) => <path key={i} d={d} />)}
            </g>
          </g>
        )
      })()}
    </svg>
  )
}

// ─── Themed Slider ────────────────────────────────────────────────────────────
function ThemedSlider({ T, label, value, min, max, step, onChange, decimals = 1, disabled = false }) {
  const pct = ((value - min) / (max - min)) * 100
  const uid = label.replace(/\s+/g, "-").toLowerCase()
  const trackId = `sl-${uid}`
  const thumbColor = disabled ? T.inkDisabled : T.accent
  const trackFill  = disabled ? T.inkDisabled : T.accent
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: disabled ? 0.4 : 1, transition: "opacity 0.2s" }}>
      <style>{`
        #${trackId} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px;
          background: transparent;
          cursor: ${disabled ? "default" : "ew-resize"};
          margin: 0;
          padding: 0;
          display: block;
        }
        #${trackId}:focus { outline: none; }
        #${trackId}::-webkit-slider-runnable-track {
          height: 2px;
          background: linear-gradient(to right, ${trackFill} ${pct}%, ${T.border} ${pct}%);
          border-radius: 1px;
        }
        #${trackId}::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${thumbColor};
          outline: 2px solid ${T.canvas};
          outline-offset: 1px;
          margin-top: -7px;
          cursor: ${disabled ? "default" : "ew-resize"};
        }
        #${trackId}::-moz-range-track {
          height: 2px;
          background: ${T.border};
          border-radius: 1px;
        }
        #${trackId}::-moz-range-progress {
          height: 2px;
          background: ${trackFill};
          border-radius: 1px;
        }
        #${trackId}::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${thumbColor};
          border: 2px solid ${T.canvas};
          cursor: ${disabled ? "default" : "ew-resize"};
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: T.inkSecondary, fontFamily: "'Inter',sans-serif" }}>{label}</span>
        <span style={{ fontSize: 12, color: T.ink, fontFamily: "'Inter',sans-serif", fontWeight: 400 }}>{value.toFixed(decimals)}</span>
      </div>
      <input
        id={trackId}
        type="range"
        min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={e => !disabled && onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    canvas:         "#EEE8DD",  // surface-secondary — full-bleed canvas background
    surface:        "#F9F4EB",  // surface-primary — panels, cards
    tertiary:       "#E2DCCF",  // surface-tertiary — borders, hairlines
    ink:            "#120F08",
    inkSecondary:   "rgba(18,15,8,0.6)",
    inkDisabled:    "rgba(18,15,8,0.3)",
    accent:         "#0021CC",
    border:         "#E2DCCF",  // surface-tertiary for hairlines
    borderStrong:   "rgba(18,15,8,0.24)",
    inverseInk:     "#F9F4EB",
    inverseSurface: "#120F08",
  },
  dark: {
    canvas:         "#201C13",  // surface-secondary — full-bleed canvas background
    surface:        "#130F06",  // surface-primary — panels, cards
    tertiary:       "#30291D",  // surface-tertiary — borders, hairlines
    ink:            "#F9F4EB",
    inkSecondary:   "rgba(249,244,235,0.6)",
    inkDisabled:    "rgba(249,244,235,0.3)",
    accent:         "#0021CC",
    border:         "#30291D",  // surface-tertiary for hairlines
    borderStrong:   "rgba(249,244,235,0.2)",
    inverseInk:     "#120F08",
    inverseSurface: "#F9F4EB",
  },
}

// ─── Mode categories ──────────────────────────────────────────────────────────

// ─── Shared styles ───────────────────────────────────────────────────────────
const btnBase = {
  fontFamily: "'Inter',sans-serif", fontWeight: 400,
  cursor: "pointer", borderRadius: 8, transition: "background 0.12s, color 0.12s",
}

// ─── Sub-components (defined outside App to prevent remount on render) ────────

function SectionLabel({ children, T }) {
  return (
    <span style={{ fontSize: 10, color: T.inkDisabled, textTransform: "uppercase" }}>
      {children}
    </span>
  )
}

function Divider({ T }) {
  return <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
}



function ColorSwatch({ c, active, ink, border, setColor }) {
  return (
    <div
      onClick={() => setColor(c)}
      style={{
        width: 18, height: 18, background: c, cursor: "pointer", flexShrink: 0,
        border: `1px solid ${active ? ink : border}`,
        outline: active ? `1px solid ${ink}` : "none",
        outlineOffset: 1,
        borderRadius: 2,
      }}
    />
  )
}


// ─── Morph Timeline Editor ─────────────────────────────────────────────────────
const TIMELINE_TRACKS = [
  { key: "converge",  label: "Converge",   color: "#4A90D9", start: "convergeStart", end: "convergeEnd",  startFixed: true },
  { key: "quiver",    label: "Quiver",     color: "#E07B39", start: "quiverStart",   end: "quiverEnd"  },
  { key: "iconScale", label: "Icon scale", color: "#5BBF6A", start: "iconStart",     end: "crossEnd"   },
  { key: "blobShrink",label: "Blob shrink",color: "#9B59B6", start: "blobShrink",    end: "crossEnd",   endFixed: true },
]

function MorphTimeline({ T, morphTimeline, setMorphTimeline, speed }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)  // { key, handle: "start"|"end" }

  const mt = { convergeStart: 0, ...morphTimeline }

  const getX = (val) => `${(val * 100).toFixed(2)}%`

  const onMouseDown = (key, handle, e) => {
    e.preventDefault()
    dragging.current = { key, handle }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  const onMouseMove = (e) => {
    const d = dragging.current
    if (!d || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    let val = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width))
    val = Math.round(val * 100) / 100

    setMorphTimeline(prev => {
      const next = { ...prev }
      const track = TIMELINE_TRACKS.find(t => t.key === d.key)
      const startKey = track.start === "convergeStart" ? null : track.start
      const endKey   = track.endFixed ? null : track.end

      if (d.handle === "start" && startKey) {
        // clamp: must stay before end, and after 0
        const endVal = next[track.end] ?? 1
        next[startKey] = Math.min(val, endVal - 0.02)
      } else if (d.handle === "end" && endKey) {
        // crossEnd drives both iconScale end and blobShrink end
        const startVal = next[track.start] ?? 0
        next[endKey] = Math.max(val, startVal + 0.02)
      }
      return next
    })
  }

  const onMouseUp = () => {
    dragging.current = null
    window.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", onMouseUp)
  }

  // Touch support
  const onTouchStart = (key, handle, e) => {
    e.preventDefault()
    dragging.current = { key, handle }
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onMouseUp)
  }
  const onTouchMove = (e) => {
    e.preventDefault()
    if (!dragging.current || !trackRef.current) return
    const touch = e.touches[0]
    const rect = trackRef.current.getBoundingClientRect()
    let val = Math.max(0.01, Math.min(0.99, (touch.clientX - rect.left) / rect.width))
    val = Math.round(val * 100) / 100
    // reuse mouse logic via synthetic event
    onMouseMove({ clientX: touch.clientX })
  }

  const loopSec = typeof speed === "number" ? speed.toFixed(1) + "s" : ""

  return (
    <div style={{ padding: "16px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSecondary, fontFamily: "'Inter',sans-serif" }}>
          Morph Timeline
        </span>
        <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily: "'Inter',sans-serif" }}>
          loop {loopSec}
        </span>
      </div>

      {/* Track area */}
      <div ref={trackRef} style={{ position: "relative", userSelect: "none" }}>
        {/* Time ruler */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <span key={v} style={{ fontSize: 9, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", width: 20, textAlign: "center" }}>
              {v === 0 ? "0" : v === 1 ? "1" : v.toString()}
            </span>
          ))}
        </div>

        {/* Track rows */}
        {TIMELINE_TRACKS.map(track => {
          const startVal = track.startFixed ? 0 : (mt[track.start] ?? 0)
          const endVal   = mt[track.end] ?? 1
          const left  = startVal * 100
          const width = Math.max(2, (endVal - startVal) * 100)

          return (
            <div key={track.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              {/* Label */}
              <div style={{ width: 68, fontSize: 10, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", flexShrink: 0, textAlign: "right" }}>
                {track.label}
              </div>
              {/* Bar container */}
              <div style={{ flex: 1, height: 20, background: T.canvas, borderRadius: 4, position: "relative", border: `1px solid ${T.border}`, overflow: "visible" }}>
                {/* Filled bar */}
                <div style={{
                  position: "absolute",
                  left: `${left}%`, width: `${width}%`,
                  top: 2, bottom: 2,
                  background: track.color,
                  borderRadius: 3,
                  opacity: 0.85,
                  pointerEvents: "none",
                }} />

                {/* Start handle */}
                {!track.startFixed && (
                  <div
                    onMouseDown={e => onMouseDown(track.key, "start", e)}
                    onTouchStart={e => onTouchStart(track.key, "start", e)}
                    style={{
                      position: "absolute",
                      left: `${left}%`, top: 0, bottom: 0,
                      width: 10, marginLeft: -5,
                      cursor: "ew-resize",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 2,
                    }}
                  >
                    <div style={{ width: 3, height: 14, background: track.color, borderRadius: 2, filter: "brightness(0.7)" }} />
                  </div>
                )}

                {/* End handle */}
                {!track.endFixed && (
                  <div
                    onMouseDown={e => onMouseDown(track.key, "end", e)}
                    onTouchStart={e => onTouchStart(track.key, "end", e)}
                    style={{
                      position: "absolute",
                      left: `${left + width}%`, top: 0, bottom: 0,
                      width: 10, marginLeft: -5,
                      cursor: "ew-resize",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 2,
                    }}
                  >
                    <div style={{ width: 3, height: 14, background: track.color, borderRadius: 2, filter: "brightness(0.7)" }} />
                  </div>
                )}

                {/* Value label inside bar */}
                <div style={{
                  position: "absolute",
                  left: `${left}%`, width: `${width}%`,
                  top: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff", fontFamily: "'Inter',sans-serif",
                  pointerEvents: "none", overflow: "hidden",
                }}>
                  {width > 12 ? `${startVal.toFixed(2)}–${endVal.toFixed(2)}` : ""}
                </div>
              </div>
            </div>
          )
        })}

        {/* Tick lines at 0.25 intervals */}
        {[0.25, 0.5, 0.75].map(v => (
          <div key={v} style={{
            position: "absolute",
            left: `calc(68px + 8px + ${v * 100}% * ((100% - 68px - 8px) / 100%))`,
            top: 16, bottom: 0,
            width: 1,
            background: T.border,
            pointerEvents: "none",
            opacity: 0.5,
          }} />
        ))}
      </div>

      {/* Quiver cycles slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={{ width: 68, fontSize: 10, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", flexShrink: 0, textAlign: "right" }}>
          Cycles
        </div>
        <div style={{ flex: 1 }}>
          <ThemedSlider
            T={T}
            label=""
            value={morphTimeline.quiverCycles ?? 3}
            min={1} max={12} step={0.5}
            decimals={1}
            onChange={v => setMorphTimeline(prev => ({ ...prev, quiverCycles: v }))}
          />
        </div>
        <div style={{ width: 24, fontSize: 10, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", textAlign: "left" }}>
          {(morphTimeline.quiverCycles ?? 3).toFixed(1)}×
        </div>
      </div>

      {/* Blob stroke slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={{ width: 68, fontSize: 10, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", flexShrink: 0, textAlign: "right" }}>
          Blob stroke
        </div>
        <div style={{ flex: 1 }}>
          <ThemedSlider
            T={T}
            label=""
            value={morphTimeline.blobStroke ?? 10}
            min={1} max={30} step={0.5}
            decimals={1}
            onChange={v => setMorphTimeline(prev => ({ ...prev, blobStroke: v }))}
          />
        </div>
        <div style={{ width: 24, fontSize: 10, color: T.inkSecondary, fontFamily: "'Inter',sans-serif", textAlign: "left" }}>
          {(morphTimeline.blobStroke ?? 10).toFixed(1)}
        </div>
      </div>

      {/* Reset button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={() => setMorphTimeline({ convergeEnd:0.35, quiverStart:0.01, quiverPeak:0.40, quiverEnd:0.80, quiverCycles:1.5, iconStart:0.40, blobShrink:0.40, crossEnd:0.80, blobStroke:30 })}
          style={{
            fontSize: 10, color: T.inkSecondary, background: "none", border: "none",
            cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "2px 4px",
            textDecoration: "underline",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function ControlsPanel({ T, mode, setMode, speed, setSpeed, dotRadius, setDotRadius,
  size, setSize, transitionDuration, setTransitionDuration, color, setColor, mobile,
  audioActive, setAudioActive, audioMode, setAudioMode, micStatus,
  selectedIcon, setSelectedIcon,
  cycleAll, setCycleAll,
  iconStrokeWidth, setIconStrokeWidth,
  morphTimeline, setMorphTimeline }) {

  const allModeKeys = Object.keys(MODES)
  const swatches = ["#0021CC","#120F08","#F9F4EB","#CF2617","#0F8A38","#E5A119"]

  const audioModeLabel = audioMode === "plus" ? "Audio+" : "Audio"
  const micLabel = micStatus === "requesting" ? "Requesting…"
    : micStatus === "sim"        ? (audioMode === "plus" ? "Sim+" : "Simulated")
    : audioActive                ? (audioMode === "plus" ? "Audio+" : "Audio on")
    : audioModeLabel

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Mode */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel T={T}>Mode</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => {
              const idx = allModeKeys.indexOf(mode)
              setMode(allModeKeys[(idx - 1 + allModeKeys.length) % allModeKeys.length])
            }}
            style={{
              ...btnBase,
              width: 32, height: 32, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              color: T.inkSecondary,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            ‹
          </button>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              style={{
                ...btnBase,
                width: "100%",
                height: 32,
                padding: "0 28px 0 12px",
                fontSize: 12,
                fontFamily: "'Inter',sans-serif",
                fontWeight: 400,
                color: T.ink,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                appearance: "none",
                WebkitAppearance: "none",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {allModeKeys.map(k => (
                <option key={k} value={k}>{MODE_LABELS[k]}</option>
              ))}
            </select>
            <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none", fontSize: 10, color: T.inkSecondary,
            }}>▾</span>
          </div>
          <button
            onClick={() => {
              const idx = allModeKeys.indexOf(mode)
              setMode(allModeKeys[(idx + 1) % allModeKeys.length])
            }}
            style={{
              ...btnBase,
              width: 32, height: 32, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              color: T.inkSecondary,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            ›
          </button>
        </div>
      </div>

      <Divider T={T} />

      {/* Parameters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel T={T}>Parameters</SectionLabel>
          {/* Audio toggle */}
          <button
            onClick={() => {
              if (!audioActive) {
                setAudioActive(true)
              } else if (audioMode === "on") {
                setAudioMode("plus")
              } else {
                setAudioActive(false)
                setAudioMode("on")
              }
            }}
            disabled={micStatus === "requesting"}
            style={{
              ...btnBase,
              fontSize: 10,
              height: 24,
              padding: "0 10px",
              borderRadius: 8,
              border: `1px solid ${audioActive ? T.accent : T.border}`,
              background: audioActive ? T.accent : "transparent",
              color: audioActive ? "#F9F4EB" : T.inkSecondary,
              cursor: micStatus === "requesting" ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {/* Mic icon — tiny inline SVG */}
            <svg width="9" height="11" viewBox="0 0 9 11" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2.5" y="0.5" width="4" height="6" rx="2"
                fill={audioActive ? "#F9F4EB" : T.inkSecondary} />
              <path d="M1 5.5C1 7.43 2.57 9 4.5 9C6.43 9 8 7.43 8 5.5"
                stroke={audioActive ? "#F9F4EB" : T.inkSecondary}
                strokeWidth="1" strokeLinecap="round" fill="none"/>
              <line x1="4.5" y1="9" x2="4.5" y2="10.5"
                stroke={audioActive ? "#F9F4EB" : T.inkSecondary}
                strokeWidth="1" strokeLinecap="round"/>
            </svg>
            {micLabel}
          </button>
        </div>
        <ThemedSlider T={T} label="Speed"      value={speed}              min={0.2} max={10}  step={0.1}  onChange={setSpeed} />
        <ThemedSlider T={T} label="Dot radius" value={dotRadius}          min={1}   max={20}  step={0.5}  onChange={setDotRadius} />
        {!mobile && <ThemedSlider T={T} label="Size" value={size}         min={48}  max={320} step={1}    onChange={setSize} decimals={0} />}
        <ThemedSlider T={T} label="Transition" value={transitionDuration} min={0}   max={2}   step={0.05} onChange={setTransitionDuration} />
      </div>

      <Divider T={T} />

      {/* Icon (morph mode) */}
      {mode === "morph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel T={T}>Icon</SectionLabel>
          <select
            value={selectedIcon}
            onChange={e => setSelectedIcon(e.target.value)}
            style={{
              fontFamily: "'Inter',sans-serif", fontWeight: 400,
              fontSize: 12,
              color: T.ink,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "6px 10px",
              height: 32,
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
              outline: "none",
              width: "100%",
            }}
          >
            {Object.entries(LUCIDE_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Cycle All toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily: "'Inter',sans-serif" }}>Cycle all</span>
            <div
              onClick={() => setCycleAll(v => !v)}
              style={{
                width: 32, height: 18, borderRadius: 9,
                background: cycleAll ? T.accent : T.border,
                cursor: "pointer", position: "relative",
                transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 2,
                left: cycleAll ? 16 : 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>

          <ThemedSlider T={T} label="Stroke width" value={iconStrokeWidth} min={0.5} max={10} step={0.25} onChange={setIconStrokeWidth} />
          <MorphTimeline T={T} morphTimeline={morphTimeline} setMorphTimeline={setMorphTimeline} speed={speed} />
        </div>
      )}

      {/* Color */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel T={T}>Color</SectionLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            width: 24, height: 24,
            background: color,
            flexShrink: 0, position: "relative",
            border: `1px solid ${T.border}`, overflow: "hidden", borderRadius: 2,
          }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ position: "absolute", inset: "-4px", width: "calc(100% + 8px)", height: "calc(100% + 8px)", opacity: 0, cursor: "pointer" }} />
          </div>
          <span style={{ fontSize: 12, color: T.ink, fontFamily: "monospace" }}>
            {color.toUpperCase()}
          </span>
          <button onClick={() => setColor("#0021CC")} style={{
            ...btnBase,
            marginLeft: "auto", fontSize: 10, color: T.inkSecondary,
            background: "transparent", border: `1px solid ${T.border}`,
            padding: "3px 8px", borderRadius: 4,
          }}>Reset</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {swatches.map(c => (
            <ColorSwatch key={c} c={c} active={color === c} ink={T.ink} border={T.border} setColor={setColor} />
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]                             = useState("breathe")
  const [speed, setSpeed]                           = useState(2)
  const [dotRadius, setDotRadius]                   = useState(10)
  const [size, setSize]                             = useState(250)
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [color, setColor]                           = useState("#0021CC")
  const [themeKey, setThemeKey]                     = useState("light")
  const [mobile, setMobile]                         = useState(false)
  const [panelWidth, setPanelWidth]                 = useState(248)

  // ── Audio ──────────────────────────────────────────────────────────────────
  const [selectedIcon, setSelectedIcon]     = useState("image")
  const [cycleAll, setCycleAll]             = useState(false)
  // Morph animation timeline — all values are 0–1 fractions of one loop
  const [morphTimeline, setMorphTimeline] = useState({
    convergeEnd:  0.35,  // dots finish converging
    quiverStart:  0.01,  // quiver ramp-up begins
    quiverPeak:   0.40,  // quiver at full intensity / ramp-down begins
    quiverEnd:    0.80,  // quiver fully gone
    quiverCycles: 1.5,   // how many oscillation cycles during the quiver window
    iconStart:    0.40,  // icon begins scaling up
    blobShrink:   0.40,  // blob starts shrinking
    crossEnd:     0.80,  // blob=0, icon=full, hold begins
    blobStroke:   30,    // stroke width when icon is tiny/blob-like
  })
  const [iconStrokeWidth, setIconStrokeWidth] = useState(5)  // resting stroke width at full icon scale
  const [audioActive, setAudioActiveRaw]  = useState(false)
  const [audioMode, setAudioMode]         = useState("on")   // "on" | "plus"
  const [micStatus, setMicStatus]         = useState("idle") // idle | requesting | active | sim
  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const streamRef     = useRef(null)
  const audioLevelRef = useRef(0)  // smoothed 0–1, read each rAF by icon engine
  const audioRafRef   = useRef(0)

  const setAudioActive = (valOrFn) => {
    const next = typeof valOrFn === "function" ? valOrFn(audioActive) : valOrFn
    if (next) {
      setMicStatus("requesting")

      const tryMic = () => navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          const ctx      = new (window.AudioContext || window.webkitAudioContext)()
          const ready    = ctx.state === "suspended" ? ctx.resume() : Promise.resolve()
          return ready.then(() => {
            const source   = ctx.createMediaStreamSource(stream)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.6
            source.connect(analyser)
            audioCtxRef.current  = ctx
            analyserRef.current  = analyser
            streamRef.current    = stream
            setMicStatus("active")
            setAudioActiveRaw(true)
          })
        })

      // Fallback: simulate audio with Web Audio oscillator + LFO so the
      // feature is demonstrable even when mic is blocked (e.g. inside iframes)
      const useSim = () => {
        const ctx      = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.6

        // White noise source
        const bufSize  = ctx.sampleRate * 0.5
        const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data     = noiseBuffer.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const noise    = ctx.createBufferSource()
        noise.buffer   = noiseBuffer
        noise.loop     = true

        // LFO-driven gain to simulate voice dynamics (0.4–1.0 amplitude, ~1.2 Hz)
        const gain     = ctx.createGain()
        gain.gain.setValueAtTime(0.01, ctx.currentTime)

        // Slow LFO on the gain
        const lfo      = ctx.createOscillator()
        const lfoGain  = ctx.createGain()
        lfo.frequency.value = 1.2
        lfoGain.gain.value  = 0.4
        lfo.connect(lfoGain)
        lfoGain.connect(gain.gain)
        lfo.start()

        noise.connect(gain)
        gain.connect(analyser)
        noise.start()

        audioCtxRef.current  = ctx
        analyserRef.current  = analyser
        streamRef.current    = null  // no real stream
        setMicStatus("sim")
        setAudioActiveRaw(true)
      }

      tryMic().catch(() => {
        try { useSim() }
        catch(e) { setMicStatus("idle"); setAudioActiveRaw(false) }
      })

    } else {
      // tear down
      cancelAnimationFrame(audioRafRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null }
      analyserRef.current   = null
      audioLevelRef.current = 0
      setAudioActiveRaw(false)
      setMicStatus("idle")
    }
  }

  // Continuously poll the analyser and write smoothed level into audioLevelRef
  useEffect(() => {
    if (!audioActive) return
    const buf = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 128)
    let smooth = 0
    const poll = () => {
      audioRafRef.current = requestAnimationFrame(poll)
      const an = analyserRef.current
      if (!an) return
      an.getByteFrequencyData(buf)
      // RMS of the frequency bins → 0–1
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length) / 255
      // fast attack, slow release
      const attack  = 0.35
      const release = 0.08
      smooth = rms > smooth ? smooth + (rms - smooth) * attack : smooth + (rms - smooth) * release
      audioLevelRef.current = Math.min(1, smooth * 2.5) // boost sensitivity
    }
    audioRafRef.current = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(audioRafRef.current)
  }, [audioActive])

  // Audio drives the icon loop directly via audioLevelRef — no state mutation needed

  // ── Resize ─────────────────────────────────────────────────────────────────
  const T = THEMES[themeKey]

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const iconSize = mobile ? Math.min(window.innerWidth * 0.5, 180) : size

  const panelProps = {
    T, mode, setMode, speed, setSpeed, dotRadius, setDotRadius,
    size, setSize, transitionDuration, setTransitionDuration,
    color, setColor, mobile,
    audioActive, setAudioActive, audioMode, setAudioMode, micStatus,
    selectedIcon, setSelectedIcon,
    cycleAll, setCycleAll,
    iconStrokeWidth, setIconStrokeWidth,
    morphTimeline, setMorphTimeline,
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: T.canvas,
      fontFamily: "'Inter',sans-serif",
      fontWeight: 400,
      color: T.ink,
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; }
        input[type=color] { -webkit-appearance:none; appearance:none; border:none; padding:0; }
        input[type=color]::-webkit-color-swatch-wrapper { padding:0; }
        input[type=color]::-webkit-color-swatch { border:none; }
        ::-webkit-scrollbar { width:0; }
      `}</style>

      {/* Header */}
      <div style={{
        position: "absolute", top: 24, left: 0, right: 0,
        textAlign: "center", fontSize: 12, zIndex: 20, pointerEvents: "none",
      }}>
        <span style={{ color: T.inkSecondary }}>Listen Labs / </span>
        <span style={{ color: T.ink }}>Icon Preview</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setThemeKey(k => k === "light" ? "dark" : "light")}
        style={{
          ...btnBase,
          position: "absolute", top: 20, right: 20, zIndex: 20,
          fontSize: 10, color: T.inkSecondary,
          background: "transparent",
          border: `1px solid ${T.border}`,
          padding: "4px 12px", height: 28, borderRadius: 8,
        }}
      >
        {themeKey === "light" ? "Dark" : "Light"}
      </button>

      {mobile ? (
        // ── MOBILE ──────────────────────────────────────────────────────────
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 56 }}>
          <div style={{
            flex: "0 0 auto", height: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: T.canvas,
          }}>
            <ListenLabsIcon mode={mode} speed={speed} dotRadius={dotRadius}
              color={color} size={iconSize} transitionDuration={transitionDuration}
              audioLevelRef={audioLevelRef} audioMode={audioActive ? audioMode : "off"}
              selectedIcon={selectedIcon} iconStrokeWidth={iconStrokeWidth}
              morphTimeline={morphTimeline} cycleAll={cycleAll} setSelectedIcon={setSelectedIcon} />
          </div>
          <div style={{
            flex: 1, overflowY: "auto",
            borderTop: `1px solid ${T.border}`,
            padding: "20px 20px 48px",
          }}>
            <ControlsPanel {...panelProps} />
          </div>
        </div>

      ) : (
        // ── DESKTOP ─────────────────────────────────────────────────────────
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <div style={{
            position: "absolute", top: 8, bottom: 8, left: 8,
            width: panelWidth, flexShrink: 0,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            background: T.surface,
            overflowY: "auto", zIndex: 10,
            padding: "20px 20px 28px",
          }}>
            <ControlsPanel {...panelProps} />
            {/* Drag handle on right edge */}
            <div
              onMouseDown={e => {
                e.preventDefault()
                const startX = e.clientX
                const startW = panelWidth
                const onMove = mv => setPanelWidth(Math.max(200, Math.min(520, startW + mv.clientX - startX)))
                const onUp   = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                window.addEventListener("mousemove", onMove)
                window.addEventListener("mouseup", onUp)
              }}
              style={{
                position: "absolute", top: 0, right: -4, bottom: 0,
                width: 8, cursor: "ew-resize", zIndex: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{
                width: 3, height: 32, borderRadius: 2,
                background: T.border,
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.accent}
                onMouseLeave={e => e.currentTarget.style.background = T.border}
              />
            </div>
          </div>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: T.canvas,
          }}>
            <ListenLabsIcon mode={mode} speed={speed} dotRadius={dotRadius}
              color={color} size={size} transitionDuration={transitionDuration}
              audioLevelRef={audioLevelRef} audioMode={audioActive ? audioMode : "off"}
              selectedIcon={selectedIcon} iconStrokeWidth={iconStrokeWidth}
              morphTimeline={morphTimeline} cycleAll={cycleAll} setSelectedIcon={setSelectedIcon} />
          </div>
        </div>
      )}
    </div>
  )
}
