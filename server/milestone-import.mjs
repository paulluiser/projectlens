import { createHash } from 'node:crypto'

// Replace milestone lists once per source revision, including existing production workspaces.
// The project revision is saved on the next edit so deleted imported milestones stay deleted.
export function importTimelineMilestones(state, sources) {
  let changed = false
  const projects = state.projects.map(project => {
    const source = sources.find(item => item.id === project.id)
    if (!source?.milestoneImportRevision || project.milestoneImportRevision === source.milestoneImportRevision) return project
    changed = true
    return { ...project, milestones: structuredClone(source.milestones), milestoneImportRevision: source.milestoneImportRevision }
  })
  if (!changed) return state
  return { ...state, projects, version: createHash('sha256').update(JSON.stringify({ previous: state.version, projects })).digest('hex') }
}
