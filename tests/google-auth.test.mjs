import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHandlers } from '../server/workspace.mjs'
import { fixtureProjects } from './fixture-projects.mjs'

const clientId='123-test.apps.googleusercontent.com'
const clock=()=>Date.parse('2026-11-24T08:00:00Z')
async function fixture(t, extra={}) {
 const dir=await mkdtemp(join(tmpdir(),'lens-google-'));t.after(()=>rm(dir,{recursive:true,force:true}))
 const env={LENS_DATA_FILE:join(dir,'workspace.json'),LENS_GOOGLE_CLIENT_ID:clientId,LENS_ADMIN_EMAILS:'owner@gmail.com',LENS_SESSION_SECRET:'test-signing-secret-with-at-least-32-characters',...extra}
 let payload={sub:'google-user-123',email:'owner@gmail.com',email_verified:true,aud:clientId,iss:'https://accounts.google.com',exp:clock()/1000+3600}
 const verifyGoogleToken=async (credential,audience)=>{assert.equal(audience,clientId);if(credential!=='verified-test-token')throw Error('Invalid signature');return payload}
 let currentTime=clock()
 const handlers=createHandlers({env,projects:fixtureProjects,now:()=>currentTime,verifyGoogleToken})
 return {handlers,env,advance:ms=>{currentTime+=ms},setPayload:next=>{payload={...payload,...next}}}
}
async function call(h,method='GET',body,headers={}){
 let status=200;const result={headers:{}}
 await h({method,body,headers:{host:'localhost:5173',origin:'http://localhost:5173',...headers}}, {setHeader(k,v){result.headers[k.toLowerCase()]=v},set statusCode(v){status=v},end(value){result.body=JSON.parse(value)}})
 return {...result,status}
}
const cookies = response => [response.headers['set-cookie']].flat().filter(Boolean).map(value=>value.split(';')[0]).join('; ')
async function signIn(f,email='owner@gmail.com',sub='google-user-123'){
 const challenge=await call(f.handlers.session)
 f.setPayload({email,sub,nonce:challenge.body.nonce})
 return call(f.handlers.session,'POST',{credential:'verified-test-token'},{cookie:cookies(challenge)})
}
test('Google mode fails closed when configuration is partial and never accepts the shared password',async t=>{
 const f=await fixture(t,{LENS_ADMIN_EMAILS:'',LENS_EDITOR_PASSWORD:'old-password'})
 const state=await call(f.handlers.workspace)
 assert.equal(state.body.authMode,'google')
 assert.equal(state.body.authReady,false)
 assert.equal(state.body.canEdit,false)
 assert.equal((await call(f.handlers.session,'POST',{password:'old-password'})).status,503)
})
test('verified approved Google identity receives a secure app session without disclosing the allowlist to readers',async t=>{
 const f=await fixture(t);const response=await signIn(f)
 assert.equal(response.status,200)
 assert.match(cookies(response),/lens_editor=/)
 const headers=[response.headers['set-cookie']].flat().join(';')
 assert.match(headers,/HttpOnly/);assert.match(headers,/SameSite=Strict/)
 const state=(await call(f.handlers.workspace,'GET',undefined,{cookie:cookies(response)})).body
 assert.equal(state.canEdit,true);assert.equal(state.isAdmin,true)
 assert.equal(state.editor.email,'owner@gmail.com')
 assert.deepEqual(state.editorAccess.administrators,['owner@gmail.com'])
 const reader=(await call(f.handlers.workspace)).body
 assert.equal(reader.canEdit,false);assert.equal(reader.editorAccess,undefined);assert.equal(reader.access,undefined)
 assert.equal(JSON.stringify(reader).includes('owner@gmail.com'),false)
 const invalidChallenge=await call(f.handlers.session)
 assert.equal((await call(f.handlers.session,'POST',{credential:'bad-signature'},{cookie:cookies(invalidChallenge)})).status,401)
 assert.equal((await call(f.handlers.session,'POST',{password:'anything'})).status,400)
})
test('Google login rejects unauthorized accounts, unverified email, nonce mismatch, wrong audience/issuer and expired tokens',async t=>{
 for(const [claims,status] of [[{email:'outsider@gmail.com'},403],[{email_verified:false},403],[{nonce:'wrong'},401],[{aud:'other.apps.googleusercontent.com'},401],[{iss:'https://evil.test'},401],[{exp:clock()/1000-1},401]]){
  const f=await fixture(t);const challenge=await call(f.handlers.session)
  f.setPayload({nonce:challenge.body.nonce,...claims})
  assert.equal((await call(f.handlers.session,'POST',{credential:'verified-test-token'},{cookie:cookies(challenge)})).status,status,JSON.stringify(claims))
 }
})
test('only administrators can change editors and removal immediately revokes an existing editor session',async t=>{
 const f=await fixture(t)
 const adminCookie=cookies(await signIn(f))
 const get=async cookie=>(await call(f.handlers.workspace,'GET',undefined,{cookie})).body
 let state=await get(adminCookie)
 const update=async (cookie,emails,version=state.version)=>call(f.handlers.workspace,'POST',{action:'updateEditors',data:{emails},expectedVersion:version},{cookie})
 const added=await update(adminCookie,[' Member@Gmail.com ']);assert.equal(added.status,200)
 assert.deepEqual(added.body.editorAccess.editors,['member@gmail.com'])
 const memberCookie=cookies(await signIn(f,'member@gmail.com','google-member-456'))
 const member=await get(memberCookie);assert.equal(member.canEdit,true);assert.equal(member.isAdmin,false);assert.equal(member.editorAccess,undefined);assert.equal(member.access,undefined)
 assert.equal((await update(memberCookie,['other@gmail.com'],member.version)).status,403)
 state=await get(adminCookie)
 assert.equal((await update(adminCookie,['*@gmail.com'])).status,400)
 const removed=await update(adminCookie,[]);assert.equal(removed.status,200)
 assert.equal((await get(memberCookie)).canEdit,false)
 assert.equal((await call(f.handlers.workspace,'POST',{action:'createProject',data:{name:'Denied'},expectedVersion:removed.body.version},{cookie:memberCookie})).status,401)
 assert.equal((await get(adminCookie)).canEdit,true,'administrator cannot be removed through the editor list')
 assert.equal((await get(adminCookie.replace(/(lens_editor=[^;]+)/,'$1x'))).canEdit,false,'tampered session is rejected')
})

test('Google challenges and sessions expire and cross-origin login is rejected',async t=>{
 const f=await fixture(t)
 const challenge=await call(f.handlers.session);f.setPayload({nonce:challenge.body.nonce})
 assert.equal((await call(f.handlers.session,'POST',{credential:'verified-test-token'},{cookie:cookies(challenge),origin:'https://evil.test'})).status,403)
 f.advance(600001)
 assert.equal((await call(f.handlers.session,'POST',{credential:'verified-test-token'},{cookie:cookies(challenge)})).status,401)
 const fresh=await fixture(t);const response=await signIn(fresh);fresh.advance(28800001)
 assert.equal((await call(fresh.handlers.workspace,'GET',undefined,{cookie:cookies(response)})).body.canEdit,false)
})

test('production Google mode without shared storage cannot offer sign-in',async t=>{
 const f=await fixture(t,{VERCEL:'1'})
 const state=(await call(f.handlers.workspace)).body
 assert.equal(state.authReady,false)
 assert.equal(state.canEdit,false)
 assert.equal((await call(f.handlers.session)).body.nonce,undefined)
})
