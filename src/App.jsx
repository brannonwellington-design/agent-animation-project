import { useEffect, useState } from "react"
import { DEFAULT_MORPH_TIMELINE } from "./animation/morph.js"
import { ControlsPanel } from "./components/ControlsPanel.jsx"
import { ListenLabsIcon } from "./components/ListenLabsIcon.jsx"
import { useAudioAnalyser } from "./hooks/useAudioAnalyser.js"
import { BRAND, THEMES, btnBase, fontFamily } from "./theme/tokens.js"

export default function App() {
  const [mode, setMode] = useState("allFaces")
  const [speed, setSpeed] = useState(2)
  const [dotRadius, setDotRadius] = useState(12)
  const [size, setSize] = useState(250)
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [color, setColor] = useState(BRAND.accent)
  const [themeKey, setThemeKey] = useState("light")
  const [mobile, setMobile] = useState(false)
  const [panelWidth, setPanelWidth] = useState(248)

  const [selectedIcon, setSelectedIcon] = useState("image")
  const [cycleAll, setCycleAll] = useState(false)
  const [morphTimeline, setMorphTimeline] = useState({ ...DEFAULT_MORPH_TIMELINE })
  const [iconStrokeWidth, setIconStrokeWidth] = useState(5)

  const {
    audioActive,
    audioMode,
    setAudioMode,
    micStatus,
    setAudioActive,
    audioLevelRef,
  } = useAudioAnalyser()

  const T = THEMES[themeKey]

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const iconSize = mobile ? Math.min(window.innerWidth * 0.5, 180) : size

  const iconProps = {
    mode, speed, dotRadius, color, transitionDuration,
    audioLevelRef,
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
  }

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
        <span style={{ color: T.ink }}>Icon Preview</span>
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
          }}>
            <ListenLabsIcon {...iconProps} size={iconSize} />
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
          }}>
            <ListenLabsIcon {...iconProps} size={size} />
          </div>
        </div>
      )}
    </div>
  )
}
