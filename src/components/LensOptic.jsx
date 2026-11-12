import { useEffect, useRef } from 'react'

export function LensOptic({ chapter, reduced }) {
  const host = useRef(null)
  const target = useRef(chapter)
  const redraw = useRef(null)

  useEffect(() => {
    target.current = chapter
    redraw.current?.()
  }, [chapter])

  useEffect(() => {
    const element = host.current
    if (!element || reduced) return

    let disposed = false
    let destroy = () => {}
    let started = false

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || started) return
      started = true

      try {
        const three = await import('three')
        if (disposed) return
        destroy = mountOptic(three, element, target, redraw)
      } catch {
        // The CSS reticle remains visible when WebGL is unavailable.
      }
    })

    observer.observe(element)
    return () => {
      disposed = true
      observer.disconnect()
      destroy()
    }
  }, [reduced])

  return <div className="lens-optic" ref={host} aria-hidden="true" />
}

function mountOptic(three, element, target, redraw) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true })
  if (!context) return () => {}

  const renderer = new three.WebGLRenderer({ canvas, context, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(96, 96, false)
  const scene = new three.Scene()
  const camera = new three.PerspectiveCamera(37, 1, 0.1, 20)
  camera.position.z = 4.8
  const optic = new three.Group()
  const rings = [
    { radius: 1.05, tube: 0.018, z: 0.24, color: 0xb59aff, opacity: 0.95 },
    { radius: 0.93, tube: 0.014, z: 0.12, color: 0x8b63ef, opacity: 0.8 },
    { radius: 0.8, tube: 0.01, z: 0, color: 0xe6dafa, opacity: 0.5 },
    { radius: 0.6, tube: 0.012, z: -0.11, color: 0x9467ff, opacity: 0.8 },
  ]

  for (const ring of rings) {
    const mesh = new three.Mesh(
      new three.TorusGeometry(ring.radius, ring.tube, 8, 64),
      new three.MeshBasicMaterial({ color: ring.color, opacity: ring.opacity, transparent: true }),
    )
    mesh.position.z = ring.z
    optic.add(mesh)
  }
  scene.add(optic)
  element.appendChild(canvas)

  let frame = 0
  let onScreen = false
  let lost = false
  const angles = [-0.39, 0.48, -0.73, 0.23]

  function draw() {
    frame = 0
    if (lost || !onScreen || document.hidden) return

    const angle = angles[target.current]
    const pitch = target.current % 2 === 0 ? 0.24 : -0.23
    optic.rotation.y += (angle - optic.rotation.y) * 0.09
    optic.rotation.x += (pitch - optic.rotation.x) * 0.09
    renderer.render(scene, camera)
    element.dataset.rendered = 'true'

    if (Math.abs(angle - optic.rotation.y) + Math.abs(pitch - optic.rotation.x) > 0.005) schedule()
  }

  function schedule() {
    if (!frame && onScreen && !lost && !document.hidden) frame = requestAnimationFrame(draw)
  }

  function contextLost(event) {
    event.preventDefault()
    lost = true
    delete element.dataset.rendered
  }

  function contextRestored() {
    lost = false
    schedule()
  }

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    schedule()
  })
  observer.observe(element)
  redraw.current = schedule
  document.addEventListener('visibilitychange', schedule)
  canvas.addEventListener('webglcontextlost', contextLost)
  canvas.addEventListener('webglcontextrestored', contextRestored)

  return () => {
    redraw.current = null
    observer.disconnect()
    cancelAnimationFrame(frame)
    document.removeEventListener('visibilitychange', schedule)
    canvas.removeEventListener('webglcontextlost', contextLost)
    canvas.removeEventListener('webglcontextrestored', contextRestored)
    for (const ring of optic.children) {
      ring.geometry.dispose()
      ring.material.dispose()
    }
    renderer.dispose()
    canvas.remove()
    delete element.dataset.rendered
  }
}
