import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/motion'
import '@/styles/auth-interface.css'

const ease = [0.22, 1, 0.36, 1]
const blade = 'M50 14a36 36 0 0 1 28.7 14.3L68.2 46.6Z'

export function AuthSplash({ ready }) {
  const reduced = useReducedMotion()
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), reduced ? 100 : 1700)
    return () => clearTimeout(timer)
  }, [reduced])
  return <AnimatePresence>{(!ready || !elapsed) && <motion.div className="auth-splash" role="status" aria-label="Opening Lens" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .28 }}>
    <div className="auth-splash-brand" aria-hidden="true">
      <svg className="splash-aperture" viewBox="0 0 100 100" width="64" height="64">
        <motion.circle cx="50" cy="50" r="47" fill="none" stroke="#111110" strokeWidth="1.5" initial={{ pathLength: reduced ? 1 : 0, opacity: 1 }} animate={{ pathLength: 1, opacity: reduced ? 0 : [1, 1, 0] }} transition={{ duration: reduced ? 0 : .8, ease }} />
        <motion.circle cx="50" cy="50" r="47" fill="#111110" initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .94 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: '50px 50px' }} transition={{ delay: reduced ? 0 : .25, duration: reduced ? 0 : .6, ease }} />
        {Array.from({ length: 6 }, (_, index) => <g key={index} transform={`rotate(${index * 60} 50 50)`}>
          <motion.path d={blade} fill={index === 0 ? '#2563A6' : '#F5F3EE'} initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .72 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: '50px 50px' }} transition={{ delay: reduced ? 0 : .38 + index * .11, duration: reduced ? 0 : .48, ease }} />
        </g>)}
      </svg>
      <motion.span className="splash-wordmark" initial={{ opacity: reduced ? 1 : 0, clipPath: reduced ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)', x: reduced ? 0 : -6 }} animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)', x: 0 }} transition={{ delay: reduced ? 0 : .95, duration: reduced ? 0 : .6, ease }}>Lens</motion.span>
    </div>
  </motion.div>}</AnimatePresence>
}
