import { useRef } from "react"
import { DEFAULT_MORPH_TIMELINE } from "../animation/morph.js"
import { btnBase, fontFamily } from "../theme/tokens.js"
import { ThemedSlider } from "./ThemedSlider.jsx"
import { SectionLabel } from "./ui.jsx"

const TIMELINE_TRACKS = [
  { key: "converge",  label: "Converge",   color: "#4A90D9", start: "convergeStart", end: "convergeEnd",  startFixed: true },
  { key: "quiver",    label: "Quiver",     color: "#E07B39", start: "quiverStart",   end: "quiverEnd"  },
  { key: "iconScale", label: "Icon scale", color: "#5BBF6A", start: "iconStart",     end: "crossEnd"   },
  { key: "blobShrink",label: "Blob shrink",color: "#9B59B6", start: "blobShrink",    end: "crossEnd",   endFixed: true },
]

const trackLabelStyle = {
  width: 68,
  fontSize: 10,
  flexShrink: 0,
  textAlign: "right",
  fontFamily,
}

export function MorphTimeline({ T, morphTimeline, setMorphTimeline, speed }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)

  const mt = { convergeStart: 0, ...morphTimeline }

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
        const endVal = next[track.end] ?? 1
        next[startKey] = Math.min(val, endVal - 0.02)
      } else if (d.handle === "end" && endKey) {
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

  const onTouchStart = (key, handle, e) => {
    e.preventDefault()
    dragging.current = { key, handle }
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onMouseUp)
  }
  const onTouchMove = (e) => {
    e.preventDefault()
    if (!dragging.current || !trackRef.current) return
    onMouseMove({ clientX: e.touches[0].clientX })
  }

  const loopSec = typeof speed === "number" ? speed.toFixed(1) + "s" : ""
  const labelColor = { color: T.inkSecondary }

  return (
    <div style={{ padding: "16px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel T={T} variant="header">Morph Timeline</SectionLabel>
        <span style={{ fontSize: 11, fontFamily, ...labelColor }}>
          loop {loopSec}
        </span>
      </div>

      <div ref={trackRef} style={{ position: "relative", userSelect: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <span key={v} style={{ fontSize: 9, fontFamily, width: 20, textAlign: "center", ...labelColor }}>
              {v === 0 ? "0" : v === 1 ? "1" : v.toString()}
            </span>
          ))}
        </div>

        {TIMELINE_TRACKS.map(track => {
          const startVal = track.startFixed ? 0 : (mt[track.start] ?? 0)
          const endVal   = mt[track.end] ?? 1
          const left  = startVal * 100
          const width = Math.max(2, (endVal - startVal) * 100)

          return (
            <div key={track.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ ...trackLabelStyle, ...labelColor }}>
                {track.label}
              </div>
              <div style={{ flex: 1, height: 20, background: T.canvas, borderRadius: 4, position: "relative", border: `1px solid ${T.border}`, overflow: "visible" }}>
                <div style={{
                  position: "absolute",
                  left: `${left}%`, width: `${width}%`,
                  top: 2, bottom: 2,
                  background: track.color,
                  borderRadius: 3,
                  opacity: 0.85,
                  pointerEvents: "none",
                }} />

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

                <div style={{
                  position: "absolute",
                  left: `${left}%`, width: `${width}%`,
                  top: 0, bottom: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff", fontFamily,
                  pointerEvents: "none", overflow: "hidden",
                }}>
                  {width > 12 ? `${startVal.toFixed(2)}–${endVal.toFixed(2)}` : ""}
                </div>
              </div>
            </div>
          )
        })}

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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={{ ...trackLabelStyle, ...labelColor }}>Cycles</div>
        <div style={{ flex: 1 }}>
          <ThemedSlider
            T={T}
            value={morphTimeline.quiverCycles ?? 3}
            min={1} max={12} step={0.5}
            decimals={1}
            onChange={v => setMorphTimeline(prev => ({ ...prev, quiverCycles: v }))}
          />
        </div>
        <div style={{ width: 24, fontSize: 10, fontFamily, textAlign: "left", ...labelColor }}>
          {(morphTimeline.quiverCycles ?? 3).toFixed(1)}×
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <div style={{ ...trackLabelStyle, ...labelColor }}>Blob stroke</div>
        <div style={{ flex: 1 }}>
          <ThemedSlider
            T={T}
            value={morphTimeline.blobStroke ?? 10}
            min={1} max={30} step={0.5}
            decimals={1}
            onChange={v => setMorphTimeline(prev => ({ ...prev, blobStroke: v }))}
          />
        </div>
        <div style={{ width: 24, fontSize: 10, fontFamily, textAlign: "left", ...labelColor }}>
          {(morphTimeline.blobStroke ?? 10).toFixed(1)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={() => setMorphTimeline({ ...DEFAULT_MORPH_TIMELINE })}
          style={{
            ...btnBase,
            fontSize: 10,
            color: T.inkSecondary,
            background: "none",
            border: "none",
            padding: "2px 4px",
            textDecoration: "underline",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
