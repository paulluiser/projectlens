/* Kern's monogram: up to two initials on the green tint, like the path avatar in Kern's header.
   Colour never varies by project, because Kern keeps colour for meaning (status, progress, position). */
export function projectInitials(name = '') {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s\-_.]+/).filter(word => /^[A-Za-z0-9]/.test(word) && !/^(and|of|the)$/i.test(word))
  const letters = words.length > 1 ? [words[0][0], words.at(-1)[0]] : [...(words[0] ?? '?')].slice(0, 2)
  return letters.join('').toUpperCase()
}

export function ProjectMark({ project }) {
  return <span className="project-avatar project-mark" aria-hidden="true" translate="no">{projectInitials(project.name)}</span>
}
