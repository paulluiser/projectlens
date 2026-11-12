// Contour mark: two survey contours and a trig point, drawn inline so it inherits theme colors.
export function BrandMark({ size = 26 }) {
  return <svg className="brand-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="var(--brand-ground, var(--primary))" />
    <g fill="none" stroke="var(--brand-line, #fff)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 21.5c1.2-6.6 5.6-12 11.2-12.4 5.1-.4 9.6 3.6 9.9 8.6.3 5.3-4.6 8.4-10.4 8.4-5.4 0-11.6-.3-10.7-4.6z" />
      <path d="M10.6 20.4c.9-3.7 3.6-6.7 6.6-6.8 2.8-.1 5 2.1 5.1 4.8.1 3-2.7 4.6-6 4.6-3 0-6.2-.3-5.7-2.6z" />
    </g>
    <path fill="var(--brand-line, #fff)" d="M17 15.6l2.1 3.6h-4.2z" />
  </svg>
}

export function ProjectBrand({ size = 26 }) {
  return <>
    <BrandMark size={size} />
    <span className="brand-wordmark">Project Lens</span>
  </>
}
