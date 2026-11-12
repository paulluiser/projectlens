import { useEffect, useRef } from 'react'

// Illustrative survey sheet: one route crossing generic terrain, one pin per review chapter.
const pins = [[-1.15, 0.95], [0.55, -0.3], [1.15, 0.55], [1.7, -1.25]]
const routeStart = [-1.95, 1.65]

function height(x, z) {
  const hill = (cx, cz, spread, peak) => peak * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / spread)
  return hill(.55, -.3, .42, 1.05) + hill(-.9, -.75, .3, .7) + hill(-.4, 1.35, .5, .45) + hill(1.6, 1.45, .35, .5)
    + .09 * Math.sin(2.7 * x + .6) * Math.cos(2.2 * z - .4) - .1
}

const vertexShader = `
  varying float vHeight;
  varying vec2 vPlan;
  void main() {
    vHeight = position.y;
    vPlan = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`

const fragmentShader = `
  uniform vec3 uPaper, uContour, uWater, uWaterLine, uGrid;
  varying float vHeight;
  varying vec2 vPlan;
  void main() {
    float level = vHeight * 12.;
    float offset = abs(fract(level + .5) - .5);
    float width = fwidth(level);
    float minor = 1. - smoothstep(0., width * 1.1, offset);
    float major = 1. - smoothstep(0., width * 2., offset);
    float index = 1. - step(.5, mod(floor(level + .5), 5.));
    bool water = vHeight < 0.;
    vec3 color = mix(water ? uWater : uPaper, water ? uWaterLine : uContour, mix(minor * .62, major, index));
    vec2 cell = vPlan * 2.;
    vec2 gridLine = abs(fract(cell + .5) - .5) / fwidth(cell);
    color = mix(color, uGrid, (1. - min(min(gridLine.x, gridLine.y), 1.)) * .55);
    vec2 edge = smoothstep(vec2(2.), vec2(1.45), abs(vPlan));
    gl_FragColor = vec4(color, edge.x * edge.y);
  }
`

function fallbackPaths() {
  const rings = []
  for (const [cx, cy, count, scale] of [[300, 185, 8, 17], [120, 290, 4, 15]]) {
    for (let ring = 1; ring <= count; ring++) {
      const radius = ring * scale
      const points = Array.from({ length: 48 }, (_, step) => {
        const angle = step / 48 * Math.PI * 2
        const wobble = 1 + .08 * Math.sin(angle * 3 + ring) + .05 * Math.cos(angle * 5 - ring)
        return `${(cx + Math.cos(angle) * radius * 1.3 * wobble).toFixed(1)} ${(cy + Math.sin(angle) * radius * wobble).toFixed(1)}`
      })
      rings.push(`M${points.join('L')}Z`)
    }
  }
  return rings
}
const fallback = fallbackPaths()

export function LandingTerrain({ active, reduced }) {
  const host = useRef(null)
  const scene = useRef(null)

  useEffect(() => {
    if (!window.WebGL2RenderingContext) return
    let canceled = false
    import('three').then(three => {
      if (!canceled) scene.current = mountTerrain(three, host.current, reduced)
      scene.current?.setActive(active)
    }).catch(() => { /* The drawn fallback stays visible. */ })
    return () => {
      canceled = true
      scene.current?.dispose()
      scene.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useEffect(() => { scene.current?.setActive(active) }, [active])

  return <div className="landing-terrain" ref={host} aria-hidden="true">
    <svg className="landing-terrain-fallback" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
      {fallback.map(d => <path key={d} d={d} />)}
    </svg>
    <div className="terrain-labels">{pins.map((_, index) => <b key={index} data-active={index === active || undefined}>{index + 1}</b>)}</div>
  </div>
}

function mountTerrain(three, element, reduced) {
  three.ColorManagement.enabled = false // palette hex values render as written
  const css = getComputedStyle(element)
  const color = name => new three.Color(css.getPropertyValue(name).trim())
  const renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = three.LinearSRGBColorSpace
  element.prepend(renderer.domElement)

  const world = new three.Scene()
  const camera = new three.PerspectiveCamera(30, 1, .1, 50)
  camera.position.set(0, 4.5, 6)
  camera.lookAt(0, .05, .1)
  const sheet = new three.Group()
  world.add(sheet)

  const ground = new three.PlaneGeometry(4, 4, 220, 220)
  ground.rotateX(-Math.PI / 2)
  const position = ground.attributes.position
  for (let index = 0; index < position.count; index++) position.setY(index, height(position.getX(index), position.getZ(index)))
  ground.computeVertexNormals()
  const terrainMaterial = new three.ShaderMaterial({
    uniforms: {
      uPaper: { value: color('--paper') }, uContour: { value: color('--contour') }, uWater: { value: color('--water') },
      uWaterLine: { value: color('--survey') }, uGrid: { value: color('--grid') },
    },
    vertexShader, fragmentShader, transparent: true,
  })
  sheet.add(new three.Mesh(ground, terrainMaterial))

  const lift = ([x, z], above = .025) => new three.Vector3(x, height(x, z) + above, z)
  // Plan the route on the map, then drape every sample onto the ground so it follows the terrain.
  const drape = (points, samples) => new three.CatmullRomCurve3(new three.CatmullRomCurve3(points.map(([x, z]) => new three.Vector3(x, 0, z)))
    .getSpacedPoints(samples).map(({ x, z }) => lift([x, z])))
  const walked = drape([routeStart, [-1.5, 1.3], ...pins.slice(0, 2), [.95, .05], pins[2]], 400)
  const ahead = drape([pins[2], [1.55, -.35], pins[3]], 120)
  const walkedMaterial = new three.MeshBasicMaterial({ color: color('--survey') })
  const aheadMaterial = new three.MeshBasicMaterial({ color: color('--ink-soft'), transparent: true, opacity: .75 })
  const walkedGeometry = new three.TubeGeometry(walked, 400, .012, 6)
  const aheadGeometry = new three.TubeGeometry(ahead, 120, .008, 6)
  sheet.add(new three.Mesh(walkedGeometry, walkedMaterial), new three.Mesh(aheadGeometry, aheadMaterial))

  const inkMaterial = new three.MeshBasicMaterial({ color: color('--ink') })
  const activeMaterial = new three.MeshBasicMaterial({ color: color('--survey') })
  const stemGeometry = new three.CylinderGeometry(.007, .007, .34, 6)
  const headGeometry = new three.SphereGeometry(.045, 16, 12)
  const ringGeometry = new three.RingGeometry(.07, .095, 40)
  ringGeometry.rotateX(-Math.PI / 2)
  const ringMaterial = new three.MeshBasicMaterial({ color: color('--survey'), transparent: true, side: three.DoubleSide })
  const markers = pins.map(point => {
    const base = lift(point, 0)
    const stem = new three.Mesh(stemGeometry, inkMaterial)
    stem.position.copy(base).add(new three.Vector3(0, .17, 0))
    const head = new three.Mesh(headGeometry, inkMaterial)
    head.position.copy(base).add(new three.Vector3(0, .36, 0))
    const ring = new three.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(base).add(new three.Vector3(0, .012, 0))
    ring.visible = false
    sheet.add(stem, head, ring)
    return { stem, head, ring }
  })
  const labels = [...element.querySelectorAll('.terrain-labels b')]
  const projected = new three.Vector3()

  let active = 0
  let time = 0
  let last = performance.now()
  let lost = false
  const pointer = { x: 0, y: 0 }

  function draw(now = performance.now()) {
    const delta = Math.min((now - last) / 1000, .05)
    last = now
    if (lost || document.hidden) return
    if (!reduced) time += delta
    sheet.rotation.y = -.3 + Math.sin(time * .12) * .1 + pointer.x * .06
    sheet.rotation.x = pointer.y * .03
    markers.forEach(({ stem, head, ring }, index) => {
      const on = index === active
      stem.material = head.material = on ? activeMaterial : inkMaterial
      head.scale.setScalar(on ? 1.45 : 1)
      ring.visible = on
      const pulse = reduced ? .4 : (time * .7) % 1
      ring.scale.setScalar(1 + pulse * 1.6)
      ringMaterial.opacity = 1 - pulse
    })
    renderer.render(world, camera)
    const { clientWidth: width, clientHeight: height } = renderer.domElement
    markers.forEach(({ head }, index) => {
      head.getWorldPosition(projected).project(camera)
      labels[index].style.transform = `translate(${(projected.x + 1) / 2 * width}px, ${(1 - projected.y) / 2 * height - 26}px) translate(-50%, -50%)`
    })
    element.dataset.rendered = 'true'
  }

  function trackPointer(event) {
    if (event.pointerType === 'touch') return
    pointer.x = three.MathUtils.clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1)
    pointer.y = three.MathUtils.clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1)
  }
  function onLost(event) { event.preventDefault(); lost = true; renderer.setAnimationLoop(null); delete element.dataset.rendered }
  function onRestored() { lost = false; draw(); if (!reduced) renderer.setAnimationLoop(draw) }

  const resize = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = element
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.zoom = Math.min(1, camera.aspect / 1.2) * .94
    camera.updateProjectionMatrix()
    draw()
  })
  resize.observe(element)
  renderer.domElement.addEventListener('webglcontextlost', onLost)
  renderer.domElement.addEventListener('webglcontextrestored', onRestored)
  if (!reduced) {
    window.addEventListener('pointermove', trackPointer, { passive: true })
    renderer.setAnimationLoop(draw)
  }

  return {
    setActive(index) { active = index; if (reduced) draw() },
    dispose() {
      resize.disconnect()
      renderer.setAnimationLoop(null)
      window.removeEventListener('pointermove', trackPointer)
      renderer.domElement.removeEventListener('webglcontextlost', onLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored)
      renderer.domElement.remove()
      for (const resource of [ground, walkedGeometry, aheadGeometry, stemGeometry, headGeometry, ringGeometry, terrainMaterial, walkedMaterial, aheadMaterial, inkMaterial, activeMaterial, ringMaterial]) resource.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      delete element.dataset.rendered
      labels.forEach(label => { label.style.transform = '' })
    },
  }
}
