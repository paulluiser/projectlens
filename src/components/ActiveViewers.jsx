import { useEffect, useState } from 'react'
import { Popover } from 'radix-ui'
import { useWorkspace } from '@/lib/workspace'
import '../styles/presence.css'

const avatarColors = ['#00796B', '#7B1FA2', '#C2185B', '#3367D6', '#B34700', '#455A64']

function Avatar({ viewer, index }) {
  const initial = Array.from(viewer.firstName.trim())[0]?.toLocaleUpperCase() || '?'
  return <span className="viewer-avatar" aria-hidden="true" style={{ '--viewer-color': avatarColors[index % avatarColors.length] }}>{initial}</span>
}

export function ViewerIcons({ viewers }) {
  if (!viewers.length) return null
  const visible = viewers.slice(0, 2)
  const overflow = viewers.slice(2)
  return <div className="active-viewers" role="group" aria-label="Active viewers">
    {visible.map((viewer, index) => <Popover.Root key={viewer.id}>
      <Popover.Trigger asChild><button type="button" className="viewer-trigger" aria-label={`Show active viewer ${index + 1}`}><Avatar viewer={viewer} index={index} /></button></Popover.Trigger>
      <Popover.Portal><Popover.Content className="viewer-popover" sideOffset={8} collisionPadding={12} align="center"><strong>{viewer.firstName}</strong><Popover.Arrow className="viewer-popover-arrow" /></Popover.Content></Popover.Portal>
    </Popover.Root>)}
    {overflow.length > 0 && <Popover.Root>
      <Popover.Trigger asChild><button type="button" className="viewer-trigger viewer-overflow" aria-label={`Show ${overflow.length} more active viewers`}>+{overflow.length}</button></Popover.Trigger>
      <Popover.Portal><Popover.Content className="viewer-popover viewer-list" sideOffset={8} collisionPadding={12} align="end">{overflow.map((viewer, index) => <div key={viewer.id}><Avatar viewer={viewer} index={index + 2} /><strong>{viewer.firstName}</strong></div>)}</Popover.Content></Popover.Portal>
    </Popover.Root>}
  </div>
}

export function ActiveViewers() {
  const { workspace, session } = useWorkspace()
  const account = session || workspace
  const [viewers, setViewers] = useState([])
  const signedIn = account?.signedIn && !account?.needsName
  const identity = account?.user?.id
  useEffect(() => {
    setViewers([])
    if (!signedIn) return
    let alive = true
    let controller
    async function heartbeat() {
      if (document.hidden) return
      controller?.abort()
      controller = new AbortController()
      try {
        const response = await fetch('/api/presence', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (alive) setViewers(response.ok && Array.isArray(result.viewers) ? result.viewers.sort((a, b) => a.id.localeCompare(b.id)) : [])
      } catch (error) { if (alive && error.name !== 'AbortError') setViewers([]) }
    }
    heartbeat()
    const timer = setInterval(heartbeat, 20000)
    document.addEventListener('visibilitychange', heartbeat)
    return () => { alive = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat) }
  }, [signedIn, identity])
  return <ViewerIcons viewers={viewers} />
}
