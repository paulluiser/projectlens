// Line illustrations in Kern's style: hairline ink strokes, warm paper fills and one green accent.
// Decorative only (aria-hidden); the text beside each one carries the meaning.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

function Frame({ children, width = 160, height = 112, className = '' }) {
  return <svg className={`illustration ${className}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" focusable="false">{children}</svg>
}

// A week bracket: a calendar strip with a highlighted span and a pin on today.
export function WeekIllustration() {
  return <Frame>
    <rect x="14" y="22" width="132" height="74" rx="10" className="ill-paper" {...base} />
    <path d="M14 42h132" {...base} />
    {[0, 1, 2, 3, 4, 5, 6].map(i => <rect key={i} x={22 + i * 17.4} y="52" width="12" height="12" rx="3" className={i >= 1 && i <= 5 ? 'ill-accent-fill' : 'ill-tint'} />)}
    <path d="M38 76h66" className="ill-accent" {...base} strokeWidth="3" />
    <path d="M38 70v12M104 70v12" className="ill-accent" {...base} />
    <path d="M40 14v14M120 14v14" {...base} />
  </Frame>
}

// A board: three columns of cards, one card lifting toward the done column.
export function BoardIllustration() {
  return <Frame>
    {[0, 1, 2].map(column => <g key={column}>
      <rect x={14 + column * 46} y="18" width="40" height="80" rx="8" className="ill-tint" />
      <path d={`M${22 + column * 46} 28h18`} {...base} />
    </g>)}
    <rect x="20" y="38" width="28" height="16" rx="4" className="ill-paper" {...base} />
    <rect x="20" y="60" width="28" height="16" rx="4" className="ill-paper" {...base} />
    <rect x="66" y="38" width="28" height="16" rx="4" className="ill-paper" {...base} />
    <rect x="108" y="34" width="28" height="16" rx="4" className="ill-paper ill-lift" {...base} transform="rotate(-6 122 42)" />
    <path d="M114 42l4 4 8-8" className="ill-accent" {...base} strokeWidth="2" transform="rotate(-6 122 42)" />
  </Frame>
}

// Rising columns with a trend line: used where charts will appear once data exists.
export function ChartIllustration() {
  return <Frame>
    <path d="M18 96h124" {...base} />
    {[[30, 66], [52, 54], [74, 60], [96, 40], [118, 28]].map(([x, y], i) => <rect key={x} x={x - 7} y={y} width="14" height={96 - y} rx="3" className={i === 4 ? 'ill-accent-fill' : 'ill-tint'} />)}
    <path d="M30 58 52 46 74 52 96 32 118 20" className="ill-accent" {...base} strokeWidth="2" />
    <circle cx="118" cy="20" r="4" className="ill-accent-fill" />
  </Frame>
}

// A magnifier over an empty list: no matching results.
export function SearchIllustration() {
  return <Frame>
    {[30, 50, 70].map(y => <path key={y} d={`M22 ${y}h70`} className="ill-faint" {...base} strokeWidth="6" />)}
    <circle cx="104" cy="56" r="22" className="ill-paper" {...base} />
    <path d="m120 72 16 16" {...base} strokeWidth="3" />
    <path d="M96 56h16" className="ill-accent" {...base} strokeWidth="2" />
  </Frame>
}

// A flag on a path: milestones and project overview headers.
export function RoadmapIllustration() {
  return <Frame>
    <path d="M18 88c24 0 24-26 48-26s26 18 48 18 20-30 30-30" {...base} strokeDasharray="2 6" />
    <circle cx="18" cy="88" r="5" className="ill-accent-fill" />
    <circle cx="66" cy="62" r="5" className="ill-paper" {...base} />
    <path d="M144 50V18" {...base} />
    <path d="M144 18h-26l6 8-6 8h26" className="ill-accent-fill" />
  </Frame>
}
