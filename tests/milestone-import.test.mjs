import test from 'node:test'
import assert from 'node:assert/strict'
import { importTimelineMilestones } from '../server/milestone-import.mjs'
import { seedProjects } from '../server/seed.mjs'

test('timeline replacement removes all previous milestones and preserves reports', () => {
  const state = {version:'before',projects:[{id:'simsdotnet',months:[{id:'2026-10',report:{title:'Keep'}}],milestones:[{id:'mock',sample:true},{id:'custom',title:'Keep me',sample:false}]}]}
  const upgraded = importTimelineMilestones(state, seedProjects)
  assert.equal(upgraded.projects[0].milestones.length,56)
  assert.equal(upgraded.projects[0].milestones.some(item=>item.id==='custom'),false)
  assert.deepEqual(upgraded.projects[0].months,state.projects[0].months)
  assert.notEqual(upgraded.version,state.version)
  assert.equal(importTimelineMilestones(state, seedProjects).version,upgraded.version,'stable version until a real save')
  assert.equal(state.projects[0].milestones.length,2,'does not mutate stored state in place')
  const deleted = {...upgraded, projects:upgraded.projects.map(p=>({...p,milestones:[]}))}
  assert.equal(importTimelineMilestones(deleted, seedProjects),deleted,'does not restore user deletions')
})

test('shipped timeline records have exact source counts and preserve unknowns', () => {
  const [sims,pms,mobile] = ['simsdotnet','performance-management-system-pms','hrdotnet-mobile'].map(id=>seedProjects.find(p=>p.id===id))
  assert.equal(sims.milestones.length,56)
  assert.equal(pms.milestones.length,12)
  assert.equal(mobile.milestones.length,7)
  assert.equal(sims.milestones.find(m=>m.title==='Production go-live').dueDate,'2027-01-18')
  assert.equal(pms.milestones.at(-1).dueDate,'2026-12-15')
  assert.equal(mobile.milestones.at(-1).dueDate,'')
  assert.ok(mobile.milestones.every(m=>m.owner==='Unassigned'))
  assert.equal(mobile.milestones.filter(m=>m.status==='completed').length,1)
  assert.ok(seedProjects.every(p=>p.milestones.every(m=>!m.sample && m.description.includes('Source:'))))
})
