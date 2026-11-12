const symbols = ['folder', 'square', 'diamond', 'circle']
const colors = ['blue', 'violet', 'teal', 'amber', 'rose']

export function ProjectMark({ project }) {
  const hash = [...project.id].reduce((value, character) => (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0, 0)
  return (
    <span className="project-avatar project-mark" data-color={colors[hash % colors.length]} aria-hidden="true">
      <i data-shape={symbols[Math.floor(hash / colors.length) % symbols.length]} />
    </span>
  )
}
