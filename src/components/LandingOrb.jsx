import { useEffect, useRef } from 'react'

// Preserve Showroom's liquid motion and light it for the landing page.
const vertexShader = `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 q = position / 1.5;
    float alongY = q.y*4.+uTime*1.4;
    float alongX = q.x*3.-uTime*.9;
    float across = q.z*5.+q.x*2.-uTime*1.2;
    float wave = sin(alongY)*cos(alongX) + sin(across)*.45;
    vec3 slope = vec3(-3.*sin(alongY)*sin(alongX) + .9*cos(across),
      4.*cos(alongY)*cos(alongX), 2.25*cos(across));
    vec3 tangentSlope = slope - normal*dot(slope, normal);
    vPosition = q;
    vNormal = normalize(normalMatrix * (normal - tangentSlope*(.035/1.5)));
    vec4 viewPosition = modelViewMatrix * vec4(position + normal * wave * .035, 1.);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 p = vPosition;
    float t = uTime*.65;
    float bend = sin(p.y*3.+p.z*2.+t)*1.3+cos(p.x*3.-t*.8)*.65;
    float flow = p.y*4.2+p.x*2.+bend+t;
    float wave = sin(p.x*3.-p.y*4.+cos(p.z*3.+t)+t*.7);
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(-vViewPosition);
    vec3 keyLight = normalize(vec3(-.57,.66,.62));
    vec3 halfLight = normalize(keyLight + view);
    float key = max(dot(normal, keyLight), 0.);
    float rim = pow(1.-max(dot(normal, view), 0.), 2.5);
    float ribbon = pow(.5+.5*sin(flow),5.);
    vec3 cyan = vec3(.12,1.,.96), pink = vec3(1.,.06,.58);
    vec3 color = mix(vec3(.06,.25,1.),pink,.5+.5*sin(p.x*2.+p.y*2.+t*.6));
    color *= .10+ribbon*.95;
    color += cyan*pow(.5+.5*wave,7.)*.9;
    color = color*(.53+.47*key) + vec3(.036,.044,.10)*(.45+.55*key);
    float reflection = max(dot(normal, halfLight), 0.);
    color += vec3(.78,.85,1.)*(pow(reflection, 16.)*.33 + pow(reflection, 76.)*.64);
    color += vec3(.28,.27,.63)*pow(max(dot(normal, normalize(vec3(.52,-.62,.48))),0.), 3.)*.32;
    color += mix(cyan,pink,.5+.5*sin(p.y*3.-t))*rim*.32;
    gl_FragColor = vec4(color,1.);
  }
`

export function LandingOrb({ reduced }) {
  const host = useRef(null)

  useEffect(() => {
    if (!window.WebGL2RenderingContext) return
    const element = host.current
    let canceled = false
    let dispose
    import('three').then(three => {
      if (!canceled) dispose = mountOrb(three, element, reduced)
    }).catch(() => {
      // The CSS orb remains visible when WebGL is unavailable.
    })
    return () => {
      canceled = true
      dispose?.()
    }
  }, [reduced])

  return <div className="landing-orb-surface" ref={host} />
}

function mountOrb(three, element, reduced) {
  const renderer = new three.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.toneMapping = three.ACESFilmicToneMapping
  element.append(renderer.domElement)

  const scene = new three.Scene()
  const camera = new three.PerspectiveCamera(40, 1, .1, 100)
  camera.position.z = 8
  const geometry = new three.PlaneGeometry(1, 1, 80, 64)
  const { position, normal, uv } = geometry.attributes
  for (let index = 0; index < position.count; index++) {
    const longitude = uv.getX(index) * Math.PI * 2
    const latitude = (1 - uv.getY(index)) * Math.PI
    const x = Math.cos(longitude) * Math.sin(latitude)
    const y = Math.sin(longitude) * Math.sin(latitude)
    const z = Math.cos(latitude)
    position.setXYZ(index, x * 1.5, y * 1.5, z * 1.5)
    normal.setXYZ(index, x, y, z)
  }
  geometry.computeBoundingSphere()
  geometry.boundingSphere.radius = 2
  const material = new three.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
  })
  const sphere = new three.Mesh(geometry, material)
  scene.add(sphere)

  const radiusFraction = .41
  const baseScale = 2 * Math.tan(Math.PI / 9) * camera.position.z * radiusFraction / 1.5
  const pointer = { x: 0, y: 0 }
  let time = 0
  let lastFrame = performance.now()
  let contextLost = false

  function trackPointer(event) {
    if (event.pointerType === 'touch') return
    const bounds = element.getBoundingClientRect()
    const range = Math.max(bounds.width * radiusFraction * 3, 1)
    pointer.x = three.MathUtils.clamp((event.clientX - bounds.left - bounds.width / 2) / range, -1, 1)
    pointer.y = three.MathUtils.clamp((event.clientY - bounds.top - bounds.height / 2) / range, -1, 1)
  }

  function showFallback(event) {
    event.preventDefault()
    contextLost = true
    renderer.setAnimationLoop(null)
    delete element.dataset.rendered
  }

  function restoreContext() {
    contextLost = false
    lastFrame = performance.now()
    draw(lastFrame)
    if (!reduced) renderer.setAnimationLoop(draw)
  }

  function draw(now) {
    const delta = Math.max(0, Math.min((now - lastFrame) / 1000, .05))
    lastFrame = now
    if (contextLost || document.hidden) return
    if (!reduced) time += delta
    material.uniforms.uTime.value = time
    sphere.scale.setScalar(baseScale * (1 + Math.sin(time * .9) * .025))
    sphere.rotation.y = time * .045 + (reduced ? 0 : pointer.x * .12)
    sphere.rotation.x = .12 + (reduced ? 0 : pointer.y * .08)
    renderer.render(scene, camera)
    element.dataset.rendered = 'true'
  }

  const resize = new ResizeObserver(() => {
    renderer.setSize(element.clientWidth, element.clientHeight, false)
    draw(performance.now())
  })
  resize.observe(element)
  renderer.domElement.addEventListener('webglcontextlost', showFallback)
  renderer.domElement.addEventListener('webglcontextrestored', restoreContext)
  if (!reduced) window.addEventListener('pointermove', trackPointer, { passive: true })
  if (!reduced) renderer.setAnimationLoop(draw)

  return () => {
    resize.disconnect()
    renderer.setAnimationLoop(null)
    renderer.domElement.removeEventListener('webglcontextlost', showFallback)
    renderer.domElement.removeEventListener('webglcontextrestored', restoreContext)
    window.removeEventListener('pointermove', trackPointer)
    renderer.domElement.remove()
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    delete element.dataset.rendered
  }
}
