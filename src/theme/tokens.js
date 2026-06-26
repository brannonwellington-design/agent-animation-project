export const fontFamily = "'Inter', sans-serif"

export const BRAND = {
  accent:  "#0021CC",
  ink:     "#120F08",
  surface: "#F9F4EB",
  red:     "#CF2617",
  green:   "#0F8A38",
  gold:    "#E5A119",
}

export const onAccent = BRAND.surface

export const COLOR_SWATCHES = [
  BRAND.accent,
  BRAND.ink,
  BRAND.surface,
  BRAND.red,
  BRAND.green,
  BRAND.gold,
]

export const THEMES = {
  light: {
    canvas:         "#EEE8DD",
    surface:        BRAND.surface,
    ink:            BRAND.ink,
    inkSecondary:   "rgba(18,15,8,0.6)",
    inkDisabled:    "rgba(18,15,8,0.3)",
    accent:         BRAND.accent,
    border:         "#E2DCCF",
  },
  dark: {
    canvas:         "#201C13",
    surface:        "#130F06",
    ink:            BRAND.surface,
    inkSecondary:   "rgba(249,244,235,0.6)",
    inkDisabled:    "rgba(249,244,235,0.3)",
    accent:         BRAND.accent,
    border:         "#30291D",
  },
}

export const btnBase = {
  fontFamily,
  fontWeight: 400,
  cursor: "pointer",
  borderRadius: 8,
  transition: "background 0.12s, color 0.12s",
}
