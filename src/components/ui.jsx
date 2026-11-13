import { btnBase, fontFamily } from '../theme/tokens.js'

export function SectionLabel({ children, T, variant = "default" }) {
  const isHeader = variant === "header"
  return (
    <span style={{
      fontSize: isHeader ? 11 : 10,
      fontWeight: isHeader ? 600 : 400,
      letterSpacing: isHeader ? "0.08em" : undefined,
      color: isHeader ? T.inkSecondary : T.inkDisabled,
      textTransform: "uppercase",
      fontFamily,
    }}>
      {children}
    </span>
  )
}

export function Divider({ T }) {
  return <div style={{ height: 1, background: T.border, margin: "8px 0" }} />
}

export function ColorSwatch({ c, active, ink, border, setColor }) {
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

export function IconButton({ T, children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...btnBase,
        width: 32,
        height: 32,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: T.inkSecondary,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Toggle({ T, label, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, color: T.inkSecondary, fontFamily }}>{label}</span>
      <div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18, borderRadius: 9,
          background: checked ? T.accent : T.border,
          cursor: "pointer", position: "relative",
          transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2,
          left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
    </div>
  )
}
