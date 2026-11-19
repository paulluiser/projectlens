import { useMotionValue } from 'framer-motion'

// Report figures are immediately readable, including during keyboard navigation.
export function useMetricReveal() {
  return useMotionValue(1160)
}

export function AnimatedMetric({ value }) {
  return value
}
