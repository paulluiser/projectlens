import { createHash } from 'node:crypto'
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}
export const checksum = state => createHash('sha256').update(JSON.stringify(canonical(state))).digest('hex')
export function counts(state) {
  const projects = state.projects || []
  return { projects: projects.length, months: projects.reduce((n,p) => n + (p.months?.length || 0),0), milestones: projects.reduce((n,p) => n + (p.milestones?.length || 0),0), weeks: projects.reduce((n,p) => n + (p.weeks?.length || 0),0), tasks: projects.reduce((n,p) => n + (p.weeks || []).reduce((sum,w) => sum + (w.tasks?.length || 0),0),0), accounts: state.security?.users?.length || 0, guestCodes: state.security?.guestCodes?.length || 0, auditEvents: state.security?.auditEvents?.length || 0, historyEvents: state.history?.length || 0 }
}

export function destinationState(snapshot) {
  if (snapshot.state.storageMigration?.status !== 'frozen') throw new Error('Import requires a final frozen source snapshot.')
  return { ...snapshot.state, storageMigration: { ...snapshot.state.storageMigration, status: 'completed', sourceChecksum: snapshot.checksum } }
}
