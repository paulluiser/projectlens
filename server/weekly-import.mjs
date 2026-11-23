import { createHash } from 'node:crypto'

// Add the source weeks once per revision, including existing production workspaces.
// Weeks the team already has (same id) are kept as they are, and the revision is saved
// on the next edit, so imported weeks or tasks that are later edited or deleted stay that way.
export function importWeeklyPlans(state, sources) {
  let changed = false
  const projects = state.projects.map(project => {
    const source = sources.find(item => item.id === project.id)
    if (!source?.weeklyImportRevision || project.weeklyImportRevision === source.weeklyImportRevision) return project
    changed = true
    const existing = project.weeks ?? []
    const added = (source.weeks ?? []).filter(week => !existing.some(item => item.id === week.id))
    const weeks = [...existing, ...structuredClone(added)].sort((a, b) => a.start.localeCompare(b.start))
    return { ...project, weeks, weeklyImportRevision: source.weeklyImportRevision }
  })
  if (!changed) return state
  return { ...state, projects, version: createHash('sha256').update(JSON.stringify({ previous: state.version, projects })).digest('hex') }
}
