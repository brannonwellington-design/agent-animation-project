import { btnBase } from '../theme/tokens.js'

export function ThemedSelect({ T, value, onChange, children, style }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          ...btnBase,
          width: "100%",
          height: 32,
          padding: "0 28px 0 12px",
          fontSize: 12,
          color: T.ink,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          appearance: "none",
          WebkitAppearance: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {children}
      </select>
      <span style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        fontSize: 10,
        color: T.inkSecondary,
      }}>
        ▾
      </span>
    </div>
  )
}
