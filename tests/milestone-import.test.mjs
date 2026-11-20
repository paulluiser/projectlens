import test from 'node:test'
import assert from 'node:assert/strict'
import { importTimelineMilestones } from '../server/milestone-import.mjs'
import { seedProjects } from '../server/seed.mjs'

test('timeline replacement removes all previous milestones and preserves reports', () => {
  const state = {version:'before',projects:[{id:'simsdotnet',months:[{id:'2026-10',report:{title:'Keep'}}],milestones:[{id:'mock',sample:true},{id:'custom',title:'Keep me',sample:false}]}]}
  const upgraded = importTimelineMilestones(state, seedProjects)
  assert.equal(upgraded.projects[0].milestones.length,15)
  assert.equal(upgraded.projects[0].milestones.some(item=>item.id==='custom'),false)
  assert.deepEqual(upgraded.projects[0].months,state.projects[0].months)
  assert.notEqual(upgraded.version,state.version)
  assert.equal(importTimelineMilestones(state, seedProjects).version,upgraded.version,'stable version until a real save')
  assert.equal(state.projects[0].milestones.length,2,'does not mutate stored state in place')
  const deleted = {...upgraded, projects:upgraded.projects.map(p=>({...p,milestones:[]}))}
  assert.equal(importTimelineMilestones(deleted, seedProjects),deleted,'does not restore user deletions')
})

test('approved SDLC gates have the exact requested order and status assignments', () => {
  const expected = {
    simsdotnet: { count:15, completed:[1,2,3,4], active:5 },
    'performance-management-system-pms': { count:14, completed:[1,2,3], active:5 },
    'hrdotnet-mobile': { count:17, completed:[1,2,3,5], active:4 },
  }
  for (const [id, spec] of Object.entries(expected)) {
    const project = seedProjects.find(p=>p.id===id)
    assert.equal(project.milestones.length,spec.count)
    project.milestones.forEach((item,index)=>{
      const number=index+1
      assert.equal(item.status,spec.completed.includes(number)?'completed':number===spec.active?'in-progress':'planned',`${id} milestone ${number}`)
      assert.ok(item.id.endsWith(String(number).padStart(2,'0')))
      assert.equal(item.dueDate,'')
      assert.equal(item.startDate,'')
      assert.equal(item.owner,'Unassigned')
      assert.equal(item.description,'')
      assert.equal(item.sample,false)
      assert.equal(item.forecast,false)
    })
  }
  const mobile = seedProjects.find(p=>p.id==='hrdotnet-mobile').milestones
  assert.equal(mobile[10].title,'Android app submitted to Google Play')
  assert.equal(mobile[13].title,'iOS app submitted to Apple App Store')
  assert.equal(mobile[15].title,'iOS production release published and smoke-tested')
})
