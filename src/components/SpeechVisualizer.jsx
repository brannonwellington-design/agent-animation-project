import { useEffect, useMemo, useRef } from "react"
import { getWideBounds, getWidePixelSize } from "../animation/formFactors.js"
import {
  SPEECH_VARIANTS,
  DEFAULT_SPEECH_VARIANT,
  DEFAULT_STRING_COUNT,
  DEFAULT_DOTS_PER_STRING,
  DEFAULT_STRING_STAGGER,
  DEFAULT_EDGE_OVERLAP,
  DEFAULT_STAGGER_MODE,
  pearlParticleCount,
  ensureParticles,
} from "../animation/speechVariants.js"
import { BRAND } from "../theme/tokens.js"

/**
 * Wide speech-reactive visualizer. Separate from the square ListenLabsIcon.
 */
export function SpeechVisualizer({
  variant = DEFAULT_SPEECH_VARIANT,
  aspect = 6,
  height = 120,
  dotRadius = 10,
  color = BRAND.accent,
  speechFeaturesRef = null,
  audioActive = false,
  audioMode = "off",
  stringCount = DEFAULT_STRING_COUNT,
  dotsPerString = DEFAULT_DOTS_PER_STRING,
  stringStagger = DEFAULT_STRING_STAGGER,
  staggerMode = DEFAULT_STAGGER_MODE,
  staggerSeed = 1,
  edgeOverlap = DEFAULT_EDGE_OVERLAP,
  audioEdgeOverlap = false,
  gooEnabled = true,
}) {
  const bounds = useMemo(() => getWideBounds(aspect), [aspect])
  const pixel = useMemo(() => getWidePixelSize(height, aspect), [height, aspect])
  const count = pearlParticleCount(stringCount, dotsPerString)

  const circleRefs = useRef([])
  const particlesRef = useRef([])
  const stateRef = useRef({})

  if (circleRefs.current.length !== count) {
    circleRefs.current = new Array(count)
  }

  const pearlOpts = {
    stringCount, dotsPerString, stringStagger, staggerMode, staggerSeed,
    edgeOverlap, audioEdgeOverlap,
  }

  stateRef.current = {
    variant,
    dotRadius,
    color,
    audioMode,
    audioActive,
    speechFeaturesRef,
    bounds,
    count,
    pearlOpts,
  }

  useEffect(() => {
    let rafId
    let lastTs = performance.now()
    particlesRef.current = ensureParticles(variant, [], bounds, pearlOpts)

    const tick = (ts) => {
      rafId = requestAnimationFrame(tick)
      const st = stateRef.current
      const dt = Math.min(0.05, (ts - lastTs) / 1000)
      lastTs = ts
      const now = ts / 1000
      const b = st.bounds
      const fn = SPEECH_VARIANTS[st.variant]
      if (!fn || !b) return

      particlesRef.current = ensureParticles(
        st.variant,
        particlesRef.current,
        b,
        st.pearlOpts,
      )

      const features = st.audioActive && st.speechFeaturesRef
        ? st.speechFeaturesRef.current
        : {
            energy: 0,
            pitchNorm: 0,
            centroid: 0.25,
            voiced: 0.5,
            silence: true,
            silenceAge: 1000,
            bands: null,
          }

      const audioGain = st.audioMode === "plus" ? 1.35 : 1.0
      fn(
        features,
        b,
        particlesRef.current,
        dt,
        now,
        st.dotRadius,
        audioGain,
        st.pearlOpts,
      )

      const fill = st.color
      const els = circleRefs.current
      const particles = particlesRef.current
      const n = Math.min(particles.length, els.length)
      for (let i = 0; i < n; i++) {
        const el = els[i]
        if (!el) continue
        const p = particles[i]
        el.setAttribute("cx", p.x.toFixed(2))
        el.setAttribute("cy", p.y.toFixed(2))
        el.setAttribute("r", Math.max(0.5, p.r).toFixed(2))
        el.setAttribute("fill", fill)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [variant, bounds, stringCount, dotsPerString, stringStagger, staggerMode, staggerSeed, edgeOverlap])

  return (
    <svg
      width={pixel.width}
      height={pixel.height}
      viewBox={`0 0 ${bounds.vbW} ${bounds.vbH}`}
      fill="none"
      overflow="visible"
      style={{ display: "block", maxWidth: "100%", overflow: "visible" }}
    >
      <defs>
        <filter
          id="ll-speech-goo"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
      <g filter={gooEnabled ? "url(#ll-speech-goo)" : undefined}>
        {Array.from({ length: count }, (_, i) => (
          <circle
            key={`${variant}-${stringCount}-${dotsPerString}-${i}`}
            ref={(el) => { circleRefs.current[i] = el }}
            cx={bounds.cx}
            cy={bounds.cy}
            r={Math.max(3, dotRadius * 0.4)}
            fill={color}
          />
        ))}
      </g>
    </svg>
  )
}
