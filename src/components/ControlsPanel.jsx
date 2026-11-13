import { MODES, MODE_LABELS } from '../animation/registry.js'
import { LUCIDE_ICONS } from '../icons/lucide-paths.js'
import { BRAND, COLOR_SWATCHES, btnBase } from '../theme/tokens.js'
import { MorphTimeline } from './MorphTimeline.jsx'
import { ThemedSelect } from './ThemedSelect.jsx'
import { ThemedSlider } from './ThemedSlider.jsx'
import { ColorSwatch, Divider, IconButton, SectionLabel, Toggle } from './ui.jsx'

export function ControlsPanel({ T, mode, setMode, speed, setSpeed, dotRadius, setDotRadius,
  size, setSize, transitionDuration, setTransitionDuration, color, setColor, mobile,
  selectedIcon, setSelectedIcon,
  cycleAll, setCycleAll,
  iconStrokeWidth, setIconStrokeWidth,
  morphTimeline, setMorphTimeline,
  showFrame, setShowFrame,
}) {
  const allModeKeys = Object.keys(MODES)

  const stepMode = (delta) => {
    const idx = allModeKeys.indexOf(mode)
    setMode(allModeKeys[(idx + delta + allModeKeys.length) % allModeKeys.length])
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel T={T}>Mode</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconButton T={T} onClick={() => stepMode(-1)}>‹</IconButton>
          <ThemedSelect T={T} value={mode} onChange={e => setMode(e.target.value)} style={{ flex: 1 }}>
            {allModeKeys.map(k => (
              <option key={k} value={k}>{MODE_LABELS[k]}</option>
            ))}
          </ThemedSelect>
          <IconButton T={T} onClick={() => stepMode(1)}>›</IconButton>
        </div>
      </div>
      <Divider T={T} />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionLabel T={T}>Parameters</SectionLabel>
        <ThemedSlider T={T} label="Speed"      value={speed}              min={0.2} max={10}  step={0.1}  onChange={setSpeed} />
        <ThemedSlider T={T} label="Dot radius" value={dotRadius}          min={1}   max={20}  step={0.5}  onChange={setDotRadius} />
        {!mobile && <ThemedSlider T={T} label="Size" value={size}         min={12}  max={320} step={1}    onChange={setSize} decimals={0} />}
        <ThemedSlider T={T} label="Transition" value={transitionDuration} min={0}   max={2}   step={0.05} onChange={setTransitionDuration} />
        <Toggle T={T} label="Frame" checked={showFrame} onChange={setShowFrame} />
      </div>

      <Divider T={T} />

      {mode === "morph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel T={T}>Icon</SectionLabel>
          <ThemedSelect T={T} value={selectedIcon} onChange={e => setSelectedIcon(e.target.value)}>
            {Object.entries(LUCIDE_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </ThemedSelect>

          <Toggle T={T} label="Cycle all" checked={cycleAll} onChange={setCycleAll} />

          <ThemedSlider T={T} label="Stroke width" value={iconStrokeWidth} min={0.5} max={10} step={0.25} onChange={setIconStrokeWidth} />
          <MorphTimeline T={T} morphTimeline={morphTimeline} setMorphTimeline={setMorphTimeline} speed={speed} />
        </div>
      )}

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
          <button onClick={() => setColor(BRAND.accent)} style={{
            ...btnBase,
            marginLeft: "auto", fontSize: 10, color: T.inkSecondary,
            background: "transparent", border: `1px solid ${T.border}`,
            padding: "3px 8px", borderRadius: 4,
          }}>Reset</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {COLOR_SWATCHES.map(c => (
            <ColorSwatch key={c} c={c} active={color === c} ink={T.ink} border={T.border} setColor={setColor} />
          ))}
        </div>
      </div>

    </div>
  )
}
