import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'

const revealDuration = 1160

export function useMetricReveal(reduced) {
  const elapsed = useMotionValue(reduced ? revealDuration : 0)

  useEffect(() => {
    elapsed.set(reduced ? revealDuration : 0)
    if (reduced) return
    const animation = animate(elapsed, revealDuration, { duration: revealDuration / 1000, ease: 'linear' })
    return () => animation.stop()
  }, [elapsed, reduced])

  return elapsed
}

export function AnimatedMetric({ value, elapsed, delay = 0 }) {
  const text = String(value)
  const digits = text.match(/[0-9]/g)?.length ?? 0
  const display = useTransform(elapsed, time => {
    const progress = Math.min(1, Math.max(0, (time - delay) / 820))
    if (progress === 1 || digits === 0) return text

    const step = Math.floor(time / 72)
    const settled = Math.floor(progress * digits)
    let digitIndex = 0
    return text.replace(/[0-9]/g, digit => {
      const index = digitIndex++
      return index < settled ? digit : String((Number(digit) + 1 + (step + index * 3) % 9) % 10)
    })
  })

  if (!digits || elapsed.get() >= revealDuration) return value
  return <>
    <span className="sr-only">{text}</span>
    <motion.span className="animated-metric" aria-hidden="true">{display}</motion.span>
  </>
}
