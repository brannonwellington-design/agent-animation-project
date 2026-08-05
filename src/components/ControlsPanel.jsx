import { MODES, MODE_LABELS } from '../animation/registry.js'
import { ASPECT_MAX, ASPECT_MIN } from '../animation/formFactors.js'
import {
  SPEECH_VARIANT_KEYS,
  SPEECH_VARIANT_LABELS,
  STRING_COUNT_MIN,
  STRING_COUNT_MAX,
  DOTS_PER_STRING_MIN,
  DOTS_PER_STRING_MAX,
  STRING_STAGGER_MIN,
  STRING_STAGGER_MAX,
  EDGE_OVERLAP_MIN,
  EDGE_OVERLAP_MAX,
  BAND_SENSITIVITY_MIN,
  BAND_SENSITIVITY_MAX,
} from '../animation/speechVariants.js'
import { SPEECH_BAND_LABELS } from '../hooks/useAudioAnalyser.js'
import { LUCIDE_ICONS } from '../icons/lucide-paths.js'
import { BRAND, COLOR_SWATCHES, btnBase, fontFamily, onAccent } from '../theme/tokens.js'
import { MorphTimeline } from './MorphTimeline.jsx'
import { ThemedSelect } from './ThemedSelect.jsx'
import { ThemedSlider } from './ThemedSlider.jsx'
import { ColorSwatch, Divider, IconButton, SectionLabel } from './ui.jsx'

export function ControlsPanel({ T, mode, setMode, speed, setSpeed, dotRadius, setDotRadius,
  size, setSize, transitionDuration, setTransitionDuration, color, setColor, mobile,
  audioActive, setAudioActive, audioMode, setAudioMode, micStatus,
  selectedIcon, setSelectedIcon,
  cycleAll, setCycleAll,
  iconStrokeWidth, setIconStrokeWidth,
  morphTimeline, setMorphTimeline,
  formFactor = "square", setFormFactor,
  aspect = 6, setAspect,
  speechVariant = "pearlStrings", setSpeechVariant,
  stringCount = 4, setStringCount,
  dotsPerString = 14, setDotsPerString,
  stringStagger = 0, setStringStagger,
  staggerMode = "even", setStaggerMode,
  staggerSeed = 1, setStaggerSeed,
  edgeOverlap = 0.45, setEdgeOverlap,
  audioEdgeOverlap = false, setAudioEdgeOverlap,
  gooEnabled = true, setGooEnabled,
  bandSensitivity = null, setBandSensitivity,
}) {
  const isWide = formFactor === "wide"
  const isPearl = isWide
  const allModeKeys = Object.keys(MODES)
  const showVariantPicker = SPEECH_VARIANT_KEYS.length > 1

  const stepMode = (delta) => {
    const idx = allModeKeys.indexOf(mode)
    setMode(allModeKeys[(idx + delta + allModeKeys.length) % allModeKeys.length])
  }

  const stepVariant = (delta) => {
    const idx = SPEECH_VARIANT_KEYS.indexOf(speechVariant)
    setSpeechVariant(SPEECH_VARIANT_KEYS[(idx + delta + SPEECH_VARIANT_KEYS.length) % SPEECH_VARIANT_KEYS.length])
  }

  const audioModeLabel = audioMode === "plus" ? "Audio+" : "Audio"
  const micLabel = micStatus === "requesting" ? "Requesting…"
    : micStatus === "sim"        ? (audioMode === "plus" ? "Sim+" : "Simulated")
    : audioActive                ? (audioMode === "plus" ? "Audio+" : "Audio on")
    : audioModeLabel

  const micColor = audioActive ? onAccent : T.inkSecondary

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel T={T}>Form factor</SectionLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {[["square", "Square"], ["wide", "Wide"]].map(([key, label]) => {
            const active = formFactor === key
            return (
              <button
                key={key}
                onClick={() => setFormFactor?.(key)}
                style={{
                  ...btnBase,
                  flex: 1,
                  fontSize: 11,
                  height: 28,
                  borderRadius: 8,
                  border: `1px solid ${active ? T.accent : T.border}`,
                  background: active ? T.accent : "transparent",
                  color: active ? onAccent : T.inkSecondary,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Divider T={T} />

      {!isWide && (
        <>
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
        </>
      )}

      {isWide && showVariantPicker && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel T={T}>Speech variant</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <IconButton T={T} onClick={() => stepVariant(-1)}>‹</IconButton>
              <ThemedSelect T={T} value={speechVariant} onChange={e => setSpeechVariant(e.target.value)} style={{ flex: 1 }}>
                {SPEECH_VARIANT_KEYS.map(k => (
                  <option key={k} value={k}>{SPEECH_VARIANT_LABELS[k]}</option>
                ))}
              </ThemedSelect>
              <IconButton T={T} onClick={() => stepVariant(1)}>›</IconButton>
            </div>
          </div>
          <Divider T={T} />
        </>
      )}


      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel T={T}>Parameters</SectionLabel>
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
              color: micColor,
              cursor: micStatus === "requesting" ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg width="9" height="11" viewBox="0 0 9 11" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2.5" y="0.5" width="4" height="6" rx="2" fill={micColor} />
              <path d="M1 5.5C1 7.43 2.57 9 4.5 9C6.43 9 8 7.43 8 5.5"
                stroke={micColor} strokeWidth="1" strokeLinecap="round" fill="none"/>
              <line x1="4.5" y1="9" x2="4.5" y2="10.5"
                stroke={micColor} strokeWidth="1" strokeLinecap="round"/>
            </svg>
            {micLabel}
          </button>
        </div>
        {isWide ? (
          <>
            <ThemedSlider T={T} label="Aspect" value={aspect} min={ASPECT_MIN} max={ASPECT_MAX} step={0.1} onChange={setAspect} />
            <ThemedSlider T={T} label="Dot radius" value={dotRadius} min={1} max={20} step={0.5} onChange={setDotRadius} />
            {!mobile && <ThemedSlider T={T} label="Height" value={size} min={48} max={320} step={1} onChange={setSize} decimals={0} />}
            {isPearl && (
              <>
                <ThemedSlider T={T} label="Strings" value={stringCount} min={STRING_COUNT_MIN} max={STRING_COUNT_MAX} step={1} onChange={setStringCount} decimals={0} />
                <ThemedSlider T={T} label="Dots / string" value={dotsPerString} min={DOTS_PER_STRING_MIN} max={DOTS_PER_STRING_MAX} step={1} onChange={setDotsPerString} decimals={0} />
                <ThemedSlider T={T} label="Stagger" value={stringStagger} min={STRING_STAGGER_MIN} max={STRING_STAGGER_MAX} step={0.05} onChange={setStringStagger} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily }}>Stagger mode</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[["even", "Even"], ["random", "Random"]].map(([key, label]) => {
                      const active = staggerMode === key
                      return (
                        <button
                          key={key}
                          onClick={() => setStaggerMode?.(key)}
                          style={{
                            ...btnBase,
                            flex: 1,
                            fontSize: 11,
                            height: 28,
                            borderRadius: 8,
                            border: `1px solid ${active ? T.accent : T.border}`,
                            background: active ? T.accent : "transparent",
                            color: active ? onAccent : T.inkSecondary,
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {staggerMode === "random" && (
                    <button
                      onClick={() => setStaggerSeed?.(s => s + 1)}
                      style={{
                        ...btnBase,
                        fontSize: 11,
                        height: 28,
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: "transparent",
                        color: T.inkSecondary,
                      }}
                    >
                      Reshuffle offsets
                    </button>
                  )}
                </div>
                <ThemedSlider T={T} label="Edge overlap" value={edgeOverlap} min={EDGE_OVERLAP_MIN} max={EDGE_OVERLAP_MAX} step={0.05} onChange={setEdgeOverlap} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily }}>Audio edge</span>
                  <div
                    onClick={() => setAudioEdgeOverlap?.(v => !v)}
                    style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: audioEdgeOverlap ? T.accent : T.border,
                      cursor: "pointer", position: "relative",
                      transition: "background 0.2s", flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2,
                      left: audioEdgeOverlap ? 16 : 2,
                      width: 14, height: 14, borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </div>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily }}>Goo</span>
              <div
                onClick={() => setGooEnabled?.(v => !v)}
                style={{
                  width: 32, height: 18, borderRadius: 9,
                  background: gooEnabled ? T.accent : T.border,
                  cursor: "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 2,
                  left: gooEnabled ? 16 : 2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
            {bandSensitivity && setBandSensitivity && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
                <SectionLabel T={T}>Band sensitivity</SectionLabel>
                {SPEECH_BAND_LABELS.map((label, i) => (
                  <ThemedSlider
                    key={label}
                    T={T}
                    label={label}
                    value={bandSensitivity[i] ?? 1}
                    min={BAND_SENSITIVITY_MIN}
                    max={BAND_SENSITIVITY_MAX}
                    step={0.05}
                    onChange={(v) => setBandSensitivity(prev => {
                      const next = [...prev]
                      next[i] = v
                      return next
                    })}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <ThemedSlider T={T} label="Speed"      value={speed}              min={0.2} max={10}  step={0.1}  onChange={setSpeed} />
            <ThemedSlider T={T} label="Dot radius" value={dotRadius}          min={1}   max={20}  step={0.5}  onChange={setDotRadius} />
            {!mobile && <ThemedSlider T={T} label="Size" value={size}         min={48}  max={320} step={1}    onChange={setSize} decimals={0} />}
            <ThemedSlider T={T} label="Transition" value={transitionDuration} min={0}   max={2}   step={0.05} onChange={setTransitionDuration} />
          </>
        )}
      </div>

      <Divider T={T} />

      {!isWide && mode === "morph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel T={T}>Icon</SectionLabel>
          <ThemedSelect T={T} value={selectedIcon} onChange={e => setSelectedIcon(e.target.value)}>
            {Object.entries(LUCIDE_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </ThemedSelect>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily }}>Cycle all</span>
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
