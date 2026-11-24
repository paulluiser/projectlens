import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'

const fail = (status,message) => Object.assign(new Error(message),{status})
const normalize = email => email.trim().toLowerCase()
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@*,;]+@[^\s@*,;]+\.[^\s@*,;]+$/.test(email)
export function validateEditorEmails(emails) {
  if (!Array.isArray(emails) || emails.length > 200 || !emails.every(email => typeof email === 'string' && validEmail(normalize(email)))) throw fail(400,'Provide up to 200 valid, specific email addresses. Wildcards are not allowed.')
  return [...new Set(emails.map(normalize))].sort()
}
const envEmails = value => {
  try { return validateEditorEmails((value || '').split(/[,\n]/).map(value=>value.trim()).filter(Boolean)) } catch { return null }
}

export function createGoogleAuth({env,now,verifyGoogleToken}) {
  const clientId = env.LENS_GOOGLE_CLIENT_ID?.trim() || ''
  const requested = Boolean(clientId || env.LENS_ADMIN_EMAILS?.trim() || env.LENS_EDITOR_EMAILS?.trim())
  const administrators = envEmails(env.LENS_ADMIN_EMAILS)
  const initialEditors = envEmails(env.LENS_EDITOR_EMAILS)
  const ready = Boolean(/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId) && administrators?.length && initialEditors && env.LENS_SESSION_SECRET?.length >= 32)
  const attributes = `Path=/; HttpOnly; SameSite=Strict${env.VERCEL === '1' ? '; Secure' : ''}`
  const sign = (value,purpose) => createHmac('sha256',env.LENS_SESSION_SECRET || '').update(`${purpose}:${value}`).digest('base64url')
  const cookie = (req,name) => req.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith(name+'='))?.slice(name.length+1)
  const pack = (value,purpose) => { const encoded=Buffer.from(JSON.stringify(value)).toString('base64url');return `${encoded}.${sign(encoded,purpose)}` }
  function unpack(value,purpose) {
    if (!ready || typeof value !== 'string' || value.length > 4096) return null
    const [encoded,signature,...rest]=value.split('.')
    if (rest.length || !encoded || !signature) return null
    const expected=Buffer.from(sign(encoded,purpose));const supplied=Buffer.from(signature)
    if (expected.length!==supplied.length || !timingSafeEqual(expected,supplied)) return null
    try { const data=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));return Number.isFinite(data.expires) && data.expires>now() ? data : null } catch { return null }
  }
  function identity(req) {
    const token=cookie(req,'lens_editor')
    if (!token?.startsWith('g.')) return null
    const data=unpack(token.slice(2),'session')
    return data && typeof data.sub==='string' && data.sub && validEmail(data.email) ? data : null
  }
  function editors(state) { return state.access?.editorEmails ?? initialEditors ?? [] }
  const isAdministrator = req => { const user=identity(req);return Boolean(user && administrators?.includes(user.email)) }
  const allowed = (email,state) => Boolean(administrators?.includes(email) || editors(state).includes(email))
  const authorized = (req,state) => { const user=identity(req);return Boolean(user && allowed(user.email,state)) }
  function flags(req,state) {
    const user=identity(req)
    return { authMode:'google',authReady:ready,...(ready ? {googleClientId:clientId} : {}),isAdmin:isAdministrator(req),
      ...(user && allowed(user.email,state) ? {editor:{email:user.email}} : {}),
      ...(isAdministrator(req) ? {editorAccess:{administrators,editors:editors(state).filter(email=>!administrators.includes(email))}} : {}) }
  }
  function challenge(res) {
    if (!ready) return {}
    const nonce=randomBytes(32).toString('base64url')
    res.setHeader('Set-Cookie',`lens_google_nonce=${pack({nonce,expires:now()+600000},'nonce')}; ${attributes}; Max-Age=600`)
    return {nonce}
  }
  async function login(req,res,credential,state) {
    if (!ready) throw fail(503,'Google editor sign-in is not configured.')
    if (typeof credential!=='string' || !credential || credential.length>20000) throw fail(400,'A Google sign-in credential is required.')
    const pending=unpack(cookie(req,'lens_google_nonce'),'nonce')
    if (!pending) throw fail(401,'Sign-in expired. Reload Google sign-in and try again.')
    let payload
    try {
      payload=verifyGoogleToken ? await verifyGoogleToken(credential,clientId) : (await new OAuth2Client(clientId).verifyIdToken({idToken:credential,audience:clientId})).getPayload()
    } catch { throw fail(401,'Google sign-in could not be verified. Please try again.') }
    if (!payload || !['accounts.google.com','https://accounts.google.com'].includes(payload.iss) || payload.aud!==clientId || !Number.isFinite(payload.exp) || payload.exp<=now()/1000 || payload.nonce!==pending.nonce || typeof payload.sub!=='string' || !payload.sub) throw fail(401,'Google sign-in could not be verified. Reload sign-in and try again.')
    if (payload.email_verified!==true || !validEmail(payload.email)) throw fail(403,'A verified Google-account email is required.')
    const email=normalize(payload.email)
    if (!allowed(email,state)) throw fail(403,'This Google account does not have editor access. Ask an administrator to add your email.')
    res.setHeader('Set-Cookie',[
      `lens_editor=g.${pack({sub:payload.sub,email,expires:now()+28800000},'session')}; ${attributes}; Max-Age=28800`,
      `lens_google_nonce=; ${attributes}; Max-Age=0`,
    ])
    return {email}
  }
  function logout(res) { res.setHeader('Set-Cookie',[`lens_editor=; ${attributes}; Max-Age=0`,`lens_google_nonce=; ${attributes}; Max-Age=0`]) }
  return {requested,ready,authorized,isAdministrator,flags,challenge,login,logout}
}
