import { CX, CY, ICON_SCALE } from '../animation/constants.js'
import { LUCIDE_ICONS } from '../icons/lucide-paths.js'

export function IconOverlay({ iconRef, iconKey, color, strokeWidth }) {
  const icon = LUCIDE_ICONS[iconKey]
  if (!icon) return null
  const S = ICON_SCALE
  return (
    <g ref={iconRef}
      style={{ transform: `translate(${CX}px, ${CY}px) scale(0)`, transformOrigin: "0px 0px" }}
      stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <g transform={`translate(${-12 * S} ${-12 * S}) scale(${S})`}
         strokeWidth={strokeWidth / S}>
        {icon.paths.map((d, i) => <path key={i} d={d} />)}
      </g>
    </g>
  )
}
