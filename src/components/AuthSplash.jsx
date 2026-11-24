import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/motion'
import { ProjectBrand } from './ProjectBrand'
import '@/styles/auth-interface.css'

export function AuthSplash({ ready }) {
  const reduced = useReducedMotion()
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), reduced ? 100 : 560)
    return () => clearTimeout(timer)
  }, [reduced])
  return <AnimatePresence>{(!ready || !elapsed) && <motion.div className="auth-splash" role="status" aria-label="Opening Lens" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .18 }}>
    <motion.div className="auth-splash-brand" initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .36, ease: 'easeOut' }}><ProjectBrand size={48} /></motion.div>
  </motion.div>}</AnimatePresence>
}
