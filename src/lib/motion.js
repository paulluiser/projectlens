import { useSyncExternalStore } from 'react'

export const easing = [0.22, 1, 0.36, 1]

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

function subscribeToMotionPreference(listener) {
  motionPreference.addEventListener('change', listener)
  return () => motionPreference.removeEventListener('change', listener)
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotionPreference, () => motionPreference.matches)
}

export function fade(reduced, distance = 12) {
  return {
    initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: reduced ? 1 : 0, y: reduced ? 0 : -distance / 2 },
    transition: { duration: reduced ? 0 : 0.34, ease: easing },
  }
}
