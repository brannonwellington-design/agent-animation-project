import { useEffect, useRef } from "react"
import { CX, CY, DOTS, GRILLE_DOTS, HOME, VB, ICON_SCALE } from "../animation/constants.js"
import { easeInOut, findBestRemap, foldPingPong, getLoopPhase, getMorphSpeed } from "../animation/easing.js"
import { withMorphTimeline } from "../animation/morph.js"
import { MODES, REALTIME_MODES } from "../animation/registry.js"
import { modeStatic } from "../animation/modes.js"
import { LUCIDE_ICONS } from "../icons/lucide-paths.js"
import { BRAND } from "../theme/tokens.js"
import { IconOverlay } from "./IconOverlay.jsx"

export function ListenLabsIcon({ mode, speed, dotRadius, color=BRAND.accent, size, transitionDuration, audioLevelRef=null, audioMode="off", selectedIcon, iconStrokeWidth=5, morphTimeline=null, cycleAll=false, setSelectedIcon=null }) {
  const s = useRef({ mode, speed, dotRadius, color, fromPositions:null, fromRadii:null, transitionStart:null, transitionDuration, loopStart:null })
  const dotElsRef = useRef({})
  const grilleElsRef = useRef([])
  const quiverElsRef = useRef([])
  const iconOverlayRef = useRef(null)
  const iconCrispRef = useRef(null)
  const iconOverlayInnerRef = useRef(null)
  const iconCrispInnerRef = useRef(null)
  const blurRef = useRef(null)
  const grilleT = useRef(0)
  const iconScale = useRef(0)
  const lastLoopIdx = useRef(-1)

  s.current.speed = speed
  s.current.dotRadius = dotRadius
  s.current.transitionDuration = transitionDuration
  s.current.color = color
  s.current.audioMode = audioMode
  s.current.audioLevelRef = audioLevelRef
  s.current.morphTimeline = morphTimeline
  s.current.iconStrokeWidth = iconStrokeWidth
  s.current.cycleAll = cycleAll
  s.current.setSelectedIcon = setSelectedIcon
  s.current.currentIconKey = selectedIcon

  useEffect(() => {
    iconOverlayInnerRef.current = null
    iconCrispInnerRef.current = null
  }, [selectedIcon])

  useEffect(() => {
    if (s.current.mode !== mode) {
      const snap = {}; const snapR = {}
      for (const d of DOTS) {
        const el = dotElsRef.current[d]
        if (el) {
          snap[d] = [parseFloat(el.getAttribute("cx") || "0"), parseFloat(el.getAttribute("cy") || "0")]
          snapR[d] = parseFloat(el.getAttribute("r") || String(dotRadius))
        }
      }
      const now = performance.now() / 1000
      let switchT = getLoopPhase(now, s.current.loopStart, s.current.speed, mode, null, "off")
      if (mode === "morph") switchT = 0
      const newFn = MODES[mode] || modeStatic
      const { pos: toPos, r: toR } = newFn(switchT, s.current.dotRadius, now / s.current.speed, s.current.morphTimeline)
      const remap = findBestRemap(snap, toPos)

      s.current.fromPositions = snap
      s.current.fromRadii = snapR
      s.current.toPositions = toPos
      s.current.toRadii = toR
      s.current.dotRemap = remap
      s.current.transitionStart = now
      s.current.switchT = switchT
      s.current.mode = mode
    }
  }, [mode, dotRadius])

  useEffect(() => {
    let rafId
    const animate = (ts) => {
      rafId = requestAnimationFrame(animate)
      const st = s.current
      const now = ts / 1000

      // ── Dots ──────────────────────────────────────────────────────────────
      if (st.loopStart === null) st.loopStart = now
      const morphSpeed = getMorphSpeed(st.mode, st.speed)
      const t = getLoopPhase(now, st.loopStart, st.speed, st.mode, st.audioLevelRef, st.audioMode)
      const fn = MODES[st.mode] || modeStatic
      const effectiveRadius = st.audioMode === "plus"
        ? st.dotRadius * (1 + (st.audioLevelRef?.current ?? 0) * 1.2)
        : st.dotRadius
      const { pos: tp, r: tr } = fn(t, effectiveRadius, now / st.speed, st.morphTimeline)
      let fp = tp, fr = tr
      if (st.fromPositions && st.transitionStart !== null) {
        const tBlend = Math.min((now - st.transitionStart) / st.transitionDuration, 1)
        const ease = easeInOut(tBlend)
        const bp = {}, br = {}
        const useStatic = !REALTIME_MODES.has(st.mode)
        const toPos = useStatic ? (st.toPositions || tp) : tp
        const toR = useStatic ? (st.toRadii || tr) : tr
        const remap = useStatic ? (st.dotRemap || null) : null
        for (const d of DOTS) {
          const targetSlot = remap ? remap[d] : d
          const [fx, fy] = st.fromPositions[d], [tx, ty] = toPos[targetSlot]
          bp[d] = [fx + (tx - fx) * ease, fy + (ty - fy) * ease]
          br[d] = (st.fromRadii?.[d] ?? st.dotRadius) + (toR[targetSlot] - (st.fromRadii?.[d] ?? st.dotRadius)) * ease
        }
        fp = bp; fr = br
        if (tBlend >= 1) {
          st.loopStart = now - (st.switchT || 0) * morphSpeed
          st.fromPositions = null; st.fromRadii = null; st.toPositions = null
          st.toRadii = null; st.dotRemap = null; st.transitionStart = null
        }
      }
      const fill = st.color
      for (const d of DOTS) {
        const el = dotElsRef.current[d]
        if (el) {
          el.setAttribute("cx", fp[d][0].toFixed(2))
          el.setAttribute("cy", fp[d][1].toFixed(2))
          el.setAttribute("r", fr[d].toFixed(2))
          el.setAttribute("fill", fill)
        }
      }

      // ── Grille ──────────────────────────────────────────────────────────
      const grilleTarget = st.mode === "record" ? 1 : 0
      grilleT.current += (grilleTarget - grilleT.current) * 0.06
      if (Math.abs(grilleT.current - grilleTarget) < 0.005) grilleT.current = grilleTarget
      for (let i = 0; i < grilleElsRef.current.length; i++) {
        const el = grilleElsRef.current[i]
        const dot = GRILLE_DOTS[i]
        if (!el || !dot) continue
        let targetR
        if (grilleT.current > 0.95) {
          const breath = 1 + 0.06 * Math.sin(now * (1.1 / st.speed))
          targetR = st.dotRadius * 0.42 * breath
        } else {
          const ringDelay = dot.ring * 0.14
          const localT = Math.max(0, Math.min(1, (grilleT.current - ringDelay) / (1 - ringDelay)))
          targetR = st.dotRadius * 0.42 * easeInOut(localT)
        }
        el.setAttribute("r", targetR.toFixed(2))
        el.setAttribute("fill", fill)
      }

      // ── Icon morph, quiver, blur ────────────────────────────────────────
      const overlay = iconOverlayRef.current
      if (overlay) {
        if (!iconOverlayInnerRef.current) {
          iconOverlayInnerRef.current = overlay.querySelector("g")
        }
        if (iconCrispRef.current && !iconCrispInnerRef.current) {
          iconCrispInnerRef.current = iconCrispRef.current.querySelector("g")
        }

        const isMorph = st.mode === "morph"
        const timeline = isMorph ? withMorphTimeline(st.morphTimeline) : null

        if (!isMorph || st.fromPositions) {
          iconScale.current = 0
        } else {
          const morphT = getLoopPhase(now, st.loopStart, st.speed, st.mode, st.audioLevelRef, st.audioMode)

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

          const tf = foldPingPong(morphT)
          if (tf < timeline.iconStart) {
            iconScale.current = 0
          } else if (tf < timeline.crossEnd) {
            const x = (tf - timeline.iconStart) / (timeline.crossEnd - timeline.iconStart)
            iconScale.current = easeInOut(x)
          } else {
            iconScale.current = 1
          }
        }

        const sc = iconScale.current.toFixed(4)
        const transformVal = `translate(${CX}px, ${CY}px) scale(${sc})`
        overlay.style.transform = transformVal
        overlay.style.opacity = "1"
        if (iconCrispRef.current) {
          iconCrispRef.current.style.transform = transformVal
        }

        const blobSW = timeline?.blobStroke ?? st.morphTimeline?.blobStroke ?? 10
        const targetSW = st.iconStrokeWidth ?? 5
        const dynStroke = (blobSW - iconScale.current * (blobSW - targetSW)) / ICON_SCALE
        if (iconOverlayInnerRef.current) {
          iconOverlayInnerRef.current.setAttribute("stroke-width", dynStroke.toFixed(3))
        }
        if (iconCrispInnerRef.current) {
          iconCrispInnerRef.current.setAttribute("stroke-width", dynStroke.toFixed(3))
        }

        let qIntensity = 0
        if (timeline) {
          const nowTF = foldPingPong(getLoopPhase(now, st.loopStart, st.speed, "morph", null, "off"))
          if (nowTF >= timeline.quiverStart && nowTF < timeline.quiverPeak) {
            qIntensity = easeInOut((nowTF - timeline.quiverStart) / (timeline.quiverPeak - timeline.quiverStart))
          } else if (nowTF >= timeline.quiverPeak && nowTF < timeline.quiverEnd) {
            qIntensity = easeInOut(1 - (nowTF - timeline.quiverPeak) / (timeline.quiverEnd - timeline.quiverPeak))
          }
        }
        const cycles = timeline?.quiverCycles ?? 3
        const windowDur = Math.max(0.01, (timeline?.quiverEnd ?? 0.42) - (timeline?.quiverStart ?? 0.28))
        const loopSpeed = st.speed || 2
        const baseFreq = cycles / (windowDur * loopSpeed)
        const f = baseFreq * Math.PI * 2

        for (let i = 0; i < quiverElsRef.current.length; i++) {
          const lobe = quiverElsRef.current[i]
          if (!lobe) continue
          const seed = i * 2.399
          const dx =
            Math.sin(now * f * 1.000 + seed * 1.0) * 0.50 +
            Math.sin(now * f * 1.618 + seed * 2.3) * 0.30 +
            Math.sin(now * f * 2.414 + seed * 0.7) * 0.20
          const dy =
            Math.sin(now * f * 1.303 + seed * 3.1) * 0.50 +
            Math.sin(now * f * 1.732 + seed * 1.5) * 0.30 +
            Math.sin(now * f * 2.718 + seed * 4.2) * 0.20
          const maxR = [13, 10, 15, 9][i]
          const lobeR = [5, 4, 5, 3][i] * qIntensity
          lobe.setAttribute("cx", (CX + dx * maxR * qIntensity).toFixed(2))
          lobe.setAttribute("cy", (CY + dy * maxR * qIntensity).toFixed(2))
          lobe.setAttribute("r", lobeR.toFixed(2))
        }

        if (blurRef.current) {
          const scVal = iconScale.current
          const taper = scVal < 0.85 ? 0 : (scVal - 0.85) / 0.15
          blurRef.current.setAttribute("stdDeviation", (4 * (1 - taper)).toFixed(3))
        }
      }
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} fill="none" style={{display:"block"}}>
      <defs>
        <filter id="ll-goo" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
        </filter>
      </defs>
      <g>
        {GRILLE_DOTS.map((dot, i) => (
          <circle
            key={i}
            ref={el => { if (el) grilleElsRef.current[i] = el }}
            cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r="0" opacity="1" fill={color}
          />
        ))}
      </g>
      <g filter="url(#ll-goo)">
        {DOTS.map(d => (
          <circle
            key={d}
            ref={el => { if (el) dotElsRef.current[d] = el }}
            cx={HOME[d][0]} cy={HOME[d][1]} r={dotRadius} fill={color}
          />
        ))}
        <g>
          {[0, 1, 2, 3].map(i => (
            <circle
              key={i}
              ref={el => { if (el) quiverElsRef.current[i] = el }}
              cx={CX} cy={CY} r="0" fill={color}
            />
          ))}
        </g>
        <IconOverlay iconRef={iconOverlayRef} iconKey={selectedIcon} color={color} strokeWidth={iconStrokeWidth} />
      </g>
      <IconOverlay iconRef={iconCrispRef} iconKey={selectedIcon} color={color} strokeWidth={iconStrokeWidth} />
    </svg>
  )
}
