import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'node:crypto'
const fail = (status, message, code) =>
  Object.assign(new Error(message), { status, code })
export function createSecurity({ env, now, google, production, storageReady }) {
  const secret =
    env.LENS_SESSION_SECRET ||
    (env.LENS_DEV_AUTH_BYPASS === '1' && !production
      ? `dev:${env.LENS_EDITOR_PASSWORD || 'local'}`
      : '')
  const key = createHash('sha256').update(secret).digest()
  const ready =
    secret.length >= 32 || (!production && env.LENS_DEV_AUTH_BYPASS === '1')
  const mac = (value, purpose) =>
    createHmac('sha256', key).update(`${purpose}:${value}`).digest('base64url')
  const attributes = `Path=/; HttpOnly; SameSite=Strict${production ? '; Secure' : ''}`
  const cookie = (req) =>
    req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('lens_editor='))
      ?.slice(12)
  function unpack(req) {
    const value = cookie(req)
    if (!ready || !value?.startsWith('s.')) return null
    try {
      const [prefix, data, signature, ...rest] = value.split('.')
      const expected = Buffer.from(mac(data, 'session')),
        given = Buffer.from(signature || '')
      if (
        rest.length ||
        expected.length !== given.length ||
        !timingSafeEqual(expected, given)
      )
        return null
      const parsed = JSON.parse(Buffer.from(data, 'base64url'))
      return parsed.expires > now() ? parsed : null
    } catch {
      return null
    }
  }
  function setSession(res, id, expires = now() + 28800000, clearNonce = false) {
    expires = Math.min(expires, now() + 28800000)
    const data = Buffer.from(JSON.stringify({ id, expires })).toString(
      'base64url',
    )
    const value = `lens_editor=s.${data}.${mac(data, 'session')}`
    const session = `${value}; ${attributes}; Max-Age=${Math.max(0, Math.floor((expires - now()) / 1000))}`
    res.setHeader(
      'Set-Cookie',
      clearNonce
        ? [session, `lens_google_nonce=; ${attributes}; Max-Age=0`]
        : session,
    )
    return value
  }
  const hash = (code) => mac(code, 'code')
  function encrypt(code) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv)
    return Buffer.concat([
      iv,
      cipher.update(code),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString('base64url')
  }
  function decrypt(value) {
    try {
      const b = Buffer.from(value, 'base64url'),
        cipher = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12))
      cipher.setAuthTag(b.subarray(-16))
      return Buffer.concat([
        cipher.update(b.subarray(12, -16)),
        cipher.final(),
      ]).toString()
    } catch {
      return null
    }
  }
  function data(state) {
    return (state.security ??= {
      users: [],
      guestCodes: [],
      auditEvents: [],
      attempts: {},
    })
  }
  function user(req, state) {
    const token = unpack(req)
    const users = state.security?.users || []
    if (token) {
      const u = users.find((u) => u.id === token.id)
      if (!u || (u.expires && u.expires <= now())) return null
      if (u.email && !google.allowed(u.email, state)) return null
      return u
    }
    const g = google.identity(req)
    if (g && google.allowed(g.email, state))
      return (
        users.find((u) => u.googleSub === g.sub) || {
          id: `google:${g.sub}`,
          googleSub: g.sub,
          email: g.email,
        }
      )
    return null
  }
  function flags(req, state) {
    const u = user(req, state)
    const isAdmin = Boolean(
      u?.email &&
        (env.LENS_ADMIN_EMAILS || '')
          .split(/[,\n]/)
          .map((v) => v.trim().toLowerCase())
          .includes(u.email),
    )
    const named = Boolean(u?.firstName && u?.lastName)
    return {
      ...google.flags(req, state),
      authMode: 'google',
      authRequired: true,
      storageReady,
      authReady: storageReady && ready && google.ready,
      signedIn: Boolean(u),
      needsName: Boolean(u && !named),
      user: u
        ? {
            id: u.id,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            ...(u.email ? { email: u.email } : {}),
          }
        : null,
      role: u
        ? u.role === 'guest'
          ? 'guest'
          : isAdmin
            ? 'admin'
            : 'editor'
        : null,
      canEdit: Boolean(storageReady && u && named && u.role !== 'guest'),
      isAdmin,
      ...(u?.email ? { editor: { email: u.email } } : {}),
      ...(isAdmin
        ? {
            editorAccess: {
              administrators: (env.LENS_ADMIN_EMAILS || '')
                .split(/[,\n]/)
                .map((v) => v.trim().toLowerCase())
                .filter(Boolean),
              editors: (
                state.access?.editorEmails ||
                (env.LENS_EDITOR_EMAILS || '').split(/[,\n]/)
              )
                .map((v) => v.trim().toLowerCase())
                .filter(Boolean),
            },
          }
        : { editorAccess: undefined }),
    }
  }
  function requireUser(
    req,
    state,
    { edit = false, admin = false, named = true } = {},
  ) {
    const f = flags(req, state)
    if (!f.signedIn) throw fail(401, 'Sign-in is required.')
    if (named && f.needsName)
      throw fail(
        403,
        'Enter your first and last name to continue.',
        'NAME_REQUIRED',
      )
    if ((edit && !f.canEdit) || (admin && !f.isAdmin))
      throw fail(403, 'You do not have permission for this action.')
    return user(req, state)
  }
  function names(body) {
    const result = {}
    for (const k of ['firstName', 'lastName']) {
      if (
        typeof body?.[k] !== 'string' ||
        !body[k].trim() ||
        body[k].trim().length > 80 ||
        /[\x00-\x1f\x7f]/.test(body[k])
      )
        throw fail(400, 'First and last name are required.')
      result[k] = body[k].trim()
    }
    return result
  }
  function generate(state) {
    const d = data(state)
    let code
    do {
      code = Array.from(
        { length: 7 },
        () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[randomInt(36)],
      ).join('')
    } while (
      d.users.some((u) => u.codeHash === hash(code)) ||
      d.guestCodes.some((c) => c.codeHash === hash(code)) ||
      d.retiredHashes?.includes(hash(code))
    )
    return code
  }
  function remote(state, u) {
    const code = generate(state)
    if (u.codeHash) (data(state).retiredHashes ??= []).push(u.codeHash)
    u.codeHash = hash(code)
    u.encryptedCode = encrypt(code)
    return code
  }
  function audit(state, action, u) {
    data(state).auditEvents.push({
      id: randomUUID(),
      action,
      at: new Date(now()).toISOString(),
      actor: {
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role:
          u.role === 'guest'
            ? 'guest'
            : (env.LENS_ADMIN_EMAILS || '')
                  .split(/[,\n]/)
                  .map((v) => v.trim().toLowerCase())
                  .includes(u.email)
              ? 'admin'
              : 'editor',
      },
    })
  }
  function view(req, state) {
    const u = requireUser(req, state, { edit: true })
    const d = data(state)
    return {
      ...flags(req, state),
      remoteCode: decrypt(u.encryptedCode),
      guestCodes: flags(req, state).isAdmin
        ? d.guestCodes.map(({ codeHash, ...c }) => c)
        : [],
      auditEvents: d.auditEvents.slice(-200).reverse(),
    }
  }
  function googleUser(state, g) {
    const d = data(state)
    let u = d.users.find((u) => u.googleSub === g.sub)
    if (!u) {
      u = { id: randomUUID(), googleSub: g.sub, email: g.email, role: 'editor' }
      d.users.push(u)
    }
    return u
  }
  function loginCode(state, body, req) {
    if (!ready) throw fail(503, 'Sign-in is not configured.')
    const d = data(state)
    for (const [key, bucket] of Object.entries(d.attempts))
      if (bucket.start + 900000 <= now()) delete d.attempts[key]
    const global = (d.attempts.global ??= { start: now(), count: 0 })
    if (global.count >= 500)
      throw fail(
        429,
        'Too many attempts. Try again in 15 minutes.',
        'RATE_LIMITED',
      )
    global.count++
    const address =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'local'
    const bucketKey = mac(address, 'rate')
    let bucket = d.attempts[bucketKey]
    if (!bucket || bucket.start + 900000 <= now())
      bucket = d.attempts[bucketKey] = { start: now(), count: 0 }
    if (bucket.count >= 10)
      throw fail(
        429,
        'Too many attempts. Try again in 15 minutes.',
        'RATE_LIMITED',
      )
    bucket.count++
    const code =
      typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!/^[A-Z0-9]{7}$/.test(code)) throw fail(401, 'Invalid or expired code.')
    const hashed = hash(code)
    const u = d.users.find(
      (u) =>
        u.codeHash === hashed &&
        u.role !== 'guest' &&
        (!u.email || google.allowed(u.email, state)),
    )
    if (u) {
      audit(state, 'remoteSignIn', u)
      return { user: u }
    }
    const guest = d.guestCodes.find(
      (c) =>
        c.codeHash === hashed &&
        !c.consumedAt &&
        Date.parse(c.expiresAt) > now(),
    )
    if (!guest) throw fail(401, 'Invalid or expired code.')
    if (!body.firstName || !body.lastName)
      throw fail(400, 'Enter your first and last name.', 'GUEST_NAME_REQUIRED')
    const profile = names(body)
    const visitor = {
      id: randomUUID(),
      ...profile,
      role: 'guest',
      expires: Date.parse(guest.expiresAt),
    }
    d.users.push(visitor)
    guest.consumedAt = new Date(now()).toISOString()
    guest.consumedBy = visitor.id
    audit(state, 'guestSignIn', visitor)
    return { user: visitor }
  }
  return {
    ready,
    flags,
    user,
    requireUser,
    setSession,
    names,
    data,
    remote,
    audit,
    view,
    googleUser,
    loginCode,
    generate,
    hash,
  }
}
