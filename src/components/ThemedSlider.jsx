import { useId, useState } from "react"
import { fontFamily } from "../theme/tokens.js"

const stepDecimals = (step) => (String(step).split(".")[1] || "").length

// Show `decimals` places, plus up to the step's precision when the value needs it (e.g. 0.65)
function formatValue(value, decimals, step) {
  const extra = Math.max(decimals, stepDecimals(step))
  let s = value.toFixed(extra)
  while (extra > decimals && s.includes(".") && s.length - s.indexOf(".") - 1 > decimals && s.endsWith("0")) {
    s = s.slice(0, -1)
  }
  return s.endsWith(".") ? s.slice(0, -1) : s
}

export function ThemedSlider({ T, label, value, min, max, step, onChange, decimals = 1, disabled = false }) {
  const [draft, setDraft] = useState(null) // text while the number field is being edited
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const commit = () => {
    const v = parseFloat(draft)
    if (draft !== null && Number.isFinite(v)) onChange(clamp(v))
    setDraft(null)
  }
  // Steps from the field's current text (updated immediately) so rapid or held
  // arrow presses each build on the previous step instead of a stale render
  const nudge = (input, dir, big) => {
    const base = parseFloat(input.value)
    const from = Number.isFinite(base) ? base : value
    const next = parseFloat(clamp(from + dir * step * (big ? 10 : 1)).toFixed(stepDecimals(step) + 2))
    input.value = formatValue(next, decimals, step)
    onChange(next)
    setDraft(null)
  }
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
        #${trackId}-num::-webkit-outer-spin-button,
        #${trackId}-num::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        #${trackId}-num { -moz-appearance: textfield; }
        #${trackId}-num:hover:not(:disabled) { border-color: ${T.border}; }
        #${trackId}-num:focus { border-color: ${T.accent}; outline: none; background: ${T.canvas}; }
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
        <input
          id={`${trackId}-num`}
          type="number"
          inputMode="decimal"
          aria-label={label ? `${label} value` : "Value"}
          min={min} max={max} step={step}
          disabled={disabled}
          value={draft ?? formatValue(value, decimals, step)}
          onFocus={e => { setDraft(formatValue(value, decimals, step)); e.target.select() }}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") e.currentTarget.blur()
            else if (e.key === "Escape") { setDraft(null); requestAnimationFrame(() => e.target.blur()) }
            else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault()
              nudge(e.currentTarget, e.key === "ArrowUp" ? 1 : -1, e.shiftKey)
            }
          }}
          style={{
            width: 52, height: 22, padding: "0 4px", margin: "-3px -5px -3px 0",
            fontSize: 12, color: T.ink, fontFamily, fontWeight: 400,
            textAlign: "right",
            background: "transparent",
            border: "1px solid transparent", borderRadius: 4,
            cursor: disabled ? "default" : "text",
            transition: "border-color 0.12s, background 0.12s",
          }}
        />
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
