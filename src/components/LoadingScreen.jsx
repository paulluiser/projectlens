import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { projectsPath } from '@/lib/routes.mjs'

function Bone({ className = '' }) {
  return <span className={`skeleton ${className}`} />
}

export function SidebarSkeleton() {
  return <div className="sidebar-skeleton" aria-hidden="true"><Bone /><Bone /></div>
}

export function ContourLoader() {
  return <span className="contour-loader" aria-hidden="true" />
}

export function LoadingScreen({ onRetry }) {
  const { pathname } = useLocation()
  const report = pathname.startsWith(projectsPath + '/') && pathname.slice(projectsPath.length + 1).includes('/')
  const chapter = pathname.split('/').at(-1)
  const progress = !['accomplishments', 'blockers', 'next-month'].includes(chapter)
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setSlow(false)
    const timer = setTimeout(() => setSlow(true), 10000)
    return () => clearTimeout(timer)
  }, [attempt, pathname])
  return <main id="main-content" tabIndex={-1} className="site-width loading-screen" data-loading-layout={report ? 'report' : 'directory'}>
    <div className="loading-caption" role="status" aria-live="polite"><ContourLoader />{report ? 'Loading monthly review…' : 'Loading projects…'}</div>
    <div className="loading-shape" aria-hidden="true" aria-busy="true">
      {report && <Bone className="skeleton-crumb" />}
      <div className="skeleton-heading"><div><Bone className="skeleton-title" /><Bone className="skeleton-subtitle" /></div><Bone className="skeleton-button" /></div>
      {report ? <>
        <div className="skeleton-tabs">{Array.from({ length: 4 }, (_, i) => <Bone key={i} />)}</div>
        {progress ? <><div className="skeleton-metrics">{Array.from({ length: 4 }, (_, i) => <div key={i}><Bone className="skeleton-number" /><Bone /></div>)}</div>
        <div className="skeleton-panels"><div><Bone className="skeleton-subtitle" /><Bone /><Bone /><Bone /></div><div><Bone className="skeleton-subtitle" /><Bone className="skeleton-chart" /><Bone /></div></div></> : <div className={`skeleton-report-body ${chapter === 'next-month' ? 'with-aside' : ''}`}><div>{Array.from({ length: 3 }, (_, i) => <div className="skeleton-report-row" key={i}><Bone className="skeleton-subtitle" /><Bone /><Bone /></div>)}</div>{chapter === 'next-month' && <div className="skeleton-report-row"><Bone className="skeleton-subtitle" /><Bone /><Bone /></div>}</div>}
      </> : <>
        <div className="skeleton-filters"><Bone /><Bone /></div>
        <div className="skeleton-table"><div className="skeleton-table-head">{Array.from({ length: 4 }, (_, i) => <Bone key={i} />)}</div>{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-table-row"><Bone /><Bone /><Bone /><Bone className="skeleton-button" /></div>)}</div>
      </>}
    </div>
    {slow && <div className="loading-slow" role="status"><p>This is taking longer than usual. Your saved records are unchanged.</p>{onRetry && <button className="text-link" type="button" onClick={() => { setSlow(false); setAttempt(value => value + 1); onRetry() }}>Retry loading</button>}</div>}
  </main>
}
