import { useId } from "react"
import { fontFamily } from "../theme/tokens.js"

export function ThemedSlider({ T, label, value, min, max, step, onChange, decimals = 1, disabled = false }) {
  const pct = ((value - min) / (max - min)) * 100
  const trackId = useId().replace(/:/g, "")
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
        {label ? (
          <span style={{ fontSize: 12, color: T.inkSecondary, fontFamily }}>{label}</span>
        ) : <span />}
        <span style={{ fontSize: 12, color: T.ink, fontFamily, fontWeight: 400 }}>{value.toFixed(decimals)}</span>
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
