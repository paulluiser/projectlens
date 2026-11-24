import { useSyncExternalStore } from 'react'

export const easing = [0.22, 1, 0.36, 1]

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
let reduceAnimations = false
try { reduceAnimations = localStorage.getItem('lens-reduce-motion') === 'true' } catch {}

function subscribeToMotionPreference(listener) {
  motionPreference.addEventListener('change', listener)
  window.addEventListener('lens-motion-change', listener)
  const onStorage = event => {
    if (event.key !== 'lens-reduce-motion' && event.key !== null) return
    reduceAnimations = event.newValue === 'true'
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => { motionPreference.removeEventListener('change', listener); window.removeEventListener('lens-motion-change', listener); window.removeEventListener('storage', onStorage) }
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotionPreference, () => motionPreference.matches || reduceAnimations)
}

export function useAnimationPreference() {
  const enabled = useSyncExternalStore(subscribeToMotionPreference, () => reduceAnimations)
  return [enabled, value => {
    reduceAnimations = value
    try { if (value) localStorage.setItem('lens-reduce-motion', 'true'); else localStorage.removeItem('lens-reduce-motion') } catch {}
    window.dispatchEvent(new Event('lens-motion-change'))
  }]
}

export function fade(reduced, distance = 4) {
  return {
    initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: reduced ? 1 : 0, y: reduced ? 0 : -distance / 2 },
    transition: { duration: reduced ? 0 : 0.16, ease: easing },
  }
}
