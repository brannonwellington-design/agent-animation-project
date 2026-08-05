import { useEffect, useState } from "react"
import { DEFAULT_MORPH_TIMELINE } from "./animation/morph.js"
import { DEFAULT_ASPECT } from "./animation/formFactors.js"
import {
  DEFAULT_STRING_COUNT,
  DEFAULT_DOTS_PER_STRING,
  DEFAULT_STRING_STAGGER,
  DEFAULT_EDGE_OVERLAP,
  DEFAULT_STAGGER_MODE,
  DEFAULT_SPEECH_VARIANT,
  SPEECH_VARIANT_KEYS,
} from "./animation/speechVariants.js"
import { ControlsPanel } from "./components/ControlsPanel.jsx"
import { ListenLabsIcon } from "./components/ListenLabsIcon.jsx"
import { SpeechVisualizer } from "./components/SpeechVisualizer.jsx"
import { useAudioAnalyser, DEFAULT_BAND_SENSITIVITY } from "./hooks/useAudioAnalyser.js"
import { BRAND, THEMES, btnBase, fontFamily } from "./theme/tokens.js"

export default function App() {
  const [mode, setMode] = useState("allFaces")
  const [speed, setSpeed] = useState(2)
  const [dotRadius, setDotRadius] = useState(14)
  const [size, setSize] = useState(100)
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [color, setColor] = useState(BRAND.accent)
  const [themeKey, setThemeKey] = useState("light")
  const [mobile, setMobile] = useState(false)
  const [panelWidth, setPanelWidth] = useState(248)

  const [selectedIcon, setSelectedIcon] = useState("image")
  const [cycleAll, setCycleAll] = useState(false)
  const [morphTimeline, setMorphTimeline] = useState({ ...DEFAULT_MORPH_TIMELINE })
  const [iconStrokeWidth, setIconStrokeWidth] = useState(5)

  const [formFactor, setFormFactor] = useState("square")
  const [aspect, setAspect] = useState(DEFAULT_ASPECT)
  const [speechVariant, setSpeechVariant] = useState(DEFAULT_SPEECH_VARIANT)
  const [stringCount, setStringCount] = useState(DEFAULT_STRING_COUNT)
  const [dotsPerString, setDotsPerString] = useState(DEFAULT_DOTS_PER_STRING)
  const [stringStagger, setStringStagger] = useState(DEFAULT_STRING_STAGGER)
  const [staggerMode, setStaggerMode] = useState(DEFAULT_STAGGER_MODE)
  const [staggerSeed, setStaggerSeed] = useState(1)
  const [edgeOverlap, setEdgeOverlap] = useState(DEFAULT_EDGE_OVERLAP)
  const [audioEdgeOverlap, setAudioEdgeOverlap] = useState(false)
  const [gooEnabled, setGooEnabled] = useState(true)
  const [bandSensitivity, setBandSensitivity] = useState(() => DEFAULT_BAND_SENSITIVITY())

  const {
    audioActive,
    audioMode,
    setAudioMode,
    micStatus,
    setAudioActive,
    audioLevelRef,
    audioBandsRef,
    speechFeaturesRef,
    bandSensitivityRef,
  } = useAudioAnalyser()

  // Keep analyser in sync without re-subscribing the audio poll
  bandSensitivityRef.current = bandSensitivity

  const T = THEMES[themeKey]
  const isWide = formFactor === "wide"

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (!SPEECH_VARIANT_KEYS.includes(speechVariant)) {
      setSpeechVariant(DEFAULT_SPEECH_VARIANT)
    }
  }, [speechVariant])

  // Wide canvas uses `size` as pixel height; square uses it as icon size
  const iconSize = mobile
    ? (isWide ? Math.min(window.innerWidth * 0.16, 96) : Math.min(window.innerWidth * 0.5, 180))
    : size

  const speechDotRadius = dotRadius

  const iconProps = {
    mode, speed, dotRadius, color, transitionDuration,
    audioLevelRef,
    audioBandsRef,
    audioMode: audioActive ? audioMode : "off",
    selectedIcon, iconStrokeWidth, morphTimeline, cycleAll, setSelectedIcon,
  }

  const panelProps = {
    T, mode, setMode, speed, setSpeed, dotRadius, setDotRadius,
    size, setSize, transitionDuration, setTransitionDuration,
    color, setColor, mobile,
    audioActive, setAudioActive, audioMode, setAudioMode, micStatus,
    selectedIcon, setSelectedIcon,
    cycleAll, setCycleAll,
    iconStrokeWidth, setIconStrokeWidth,
    morphTimeline, setMorphTimeline,
    formFactor, setFormFactor,
    aspect, setAspect,
    speechVariant, setSpeechVariant,
    stringCount, setStringCount,
    dotsPerString, setDotsPerString,
    stringStagger, setStringStagger,
    staggerMode, setStaggerMode,
    staggerSeed, setStaggerSeed,
    edgeOverlap, setEdgeOverlap,
    audioEdgeOverlap, setAudioEdgeOverlap,
    gooEnabled, setGooEnabled,
    bandSensitivity, setBandSensitivity,
  }

  const stage = isWide ? (
    <SpeechVisualizer
      variant={speechVariant}
      aspect={aspect}
      height={iconSize}
      dotRadius={speechDotRadius}
      color={color}
      speechFeaturesRef={speechFeaturesRef}
      audioActive={audioActive}
      audioMode={audioActive ? audioMode : "off"}
      stringCount={stringCount}
      dotsPerString={dotsPerString}
      stringStagger={stringStagger}
      staggerMode={staggerMode}
      staggerSeed={staggerSeed}
      edgeOverlap={edgeOverlap}
      audioEdgeOverlap={audioEdgeOverlap}
      gooEnabled={gooEnabled}
    />
  ) : (
    <ListenLabsIcon {...iconProps} size={iconSize} />
  )

  return (
    <div style={{
      minHeight: "100vh",
      background: T.canvas,
      fontFamily,
      fontWeight: 400,
      color: T.ink,
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 24, left: 0, right: 0,
        textAlign: "center", fontSize: 12, zIndex: 20, pointerEvents: "none",
      }}>
        <span style={{ color: T.inkSecondary }}>Listen Labs / </span>
        <span style={{ color: T.ink }}>{isWide ? "Speech Visualizer" : "Icon Preview"}</span>
      </div>

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
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 56 }}>
          <div style={{
            flex: "0 0 auto", height: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: T.canvas,
            padding: isWide ? "0 12px" : 0,
            overflow: "hidden",
          }}>
            {stage}
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
            <div
              onMouseDown={e => {
                e.preventDefault()
                const startX = e.clientX
                const startW = panelWidth
                const onMove = mv => setPanelWidth(Math.max(200, Math.min(520, startW + mv.clientX - startX)))
                const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
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
            paddingLeft: panelWidth + 16,
            paddingRight: 16,
            overflow: "hidden",
          }}>
            {stage}
          </div>
        </div>
      )}
    </div>
  )
}
