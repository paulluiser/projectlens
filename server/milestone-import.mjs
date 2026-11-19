import { createHash } from 'node:crypto'

// Upgrade older saved workspaces too: changing the seed alone would leave their mock records visible.
// The project revision is saved on the next edit so deleted imported milestones stay deleted.
export function importTimelineMilestones(state, sources) {
  let changed = false
  const projects = state.projects.map(project => {
    const source = sources.find(item => item.id === project.id)
    if (!source?.milestoneImportRevision || project.milestoneImportRevision === source.milestoneImportRevision) return project
    const retained = (project.milestones ?? []).filter(item => !item.sample && !item.id.startsWith('sample-'))
    const ids = new Set(retained.map(item => item.id))
    changed = true
    return { ...project, milestones: [...retained, ...structuredClone(source.milestones.filter(item => !ids.has(item.id)))], milestoneImportRevision: source.milestoneImportRevision }
  })
  if (!changed) return state
  return { ...state, projects, version: createHash('sha256').update(JSON.stringify({ previous: state.version, projects })).digest('hex') }
}
