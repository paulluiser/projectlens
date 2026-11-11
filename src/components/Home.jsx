import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowUpRight, CircleAlert, Flag, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { chapters, projectsPath } from '@/lib/routes.mjs'
import { fade, useReducedMotion } from '@/lib/motion'

const steps = [
  { Icon: Activity, description: 'See how delivery tracked against the plan.' },
  { Icon: Flag, description: 'Review milestones reached and work completed.' },
  { Icon: CircleAlert, description: 'Understand what held up work and how the team responded.' },
  { Icon: Route, description: 'See the next month’s priorities and key dates.' },
]

export function Home() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => { document.title = 'Project Lens · Monthly project reviews' }, [])

  return (
    <main id="main-content" tabIndex={-1} className="site-width home">
      <section className="hero" aria-labelledby="hero-title">
        <motion.div className="hero-copy" {...fade(reduced, 18)}>
          <p className="eyebrow"><span /> Monthly project reviews</p>
          <h1 id="hero-title">Project Lens<span>.</span></h1>
          <p className="hero-description">Present your monthly review live, then share it for people to explore at their own pace.</p>
          <div className="hero-actions">
            <Button asChild size="lg" className="action action-primary">
              <Link to={projectsPath}>Browse projects <ArrowUpRight size={18} /></Link>
            </Button>
          </div>
        </motion.div>

        <motion.section className="review-walkthrough" aria-labelledby="walkthrough-title" {...fade(reduced, 10)}>
          <h2 id="walkthrough-title">Inside a monthly review</h2>
          <div className="walkthrough-steps" role="group" aria-label="Review chapters">
            {chapters.map((chapter, index) => {
              const { Icon } = steps[index]
              return (
                <button key={chapter.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>
                  <span className="walkthrough-icon"><Icon size={21} /></span>
                  {chapter.label}
                </button>
              )
            })}
          </div>
          <div className="walkthrough-description" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={active} {...fade(reduced, 5)}>{steps[active].description}</motion.p>
            </AnimatePresence>
          </div>
        </motion.section>
      </section>
    </main>
  )
}
