'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SHORE_X, WATER_Y, sandHeight } from '@/lib/zesto/world'

const SIZE = 110
const SEGMENTS = 180
const CENTER: [number, number] = [8, -14]

export function Sand({ night }: { night: boolean }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    geo.translate(CENTER[0], 0, CENTER[1])
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const dry = new THREE.Color('#efc994')
    const warm = new THREE.Color('#dfae72')
    const wet = new THREE.Color('#b48a5c')
    const grass = new THREE.Color('#9db86a')
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = sandHeight(x, z)
      pos.setY(i, y)
      const grain = Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * 0.6)
      c.copy(dry).lerp(warm, 0.35 + grain * 0.25)
      const wetness = THREE.MathUtils.smoothstep(x, SHORE_X - 0.5, SHORE_X + 2.6)
      c.lerp(wet, 1 - wetness)
      const dune = THREE.MathUtils.smoothstep(y, 1.6, 2.8)
      c.lerp(grass, dune * 0.55 * (0.6 + grain * 0.4))
      colors.set([c.r, c.g, c.b], i * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} color={night ? '#c3cbe8' : '#ffffff'} />
    </mesh>
  )
}

const waterVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    world.y += sin(uTime * 0.9 + world.z * 0.15) * 0.035 + sin(uTime * 1.7 + world.x * 0.4) * 0.02;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform float uShore;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uGlint;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  void main() {
    float dist = uShore - vWorld.x;
    float depth = smoothstep(-1.0, 22.0, dist);
    vec3 col = mix(uShallow, uDeep, depth);
    float lap = uShore - 0.4 + sin(uTime * 0.8 + vWorld.z * 0.22) * 0.45;
    float foam = smoothstep(0.55, 0.0, abs(vWorld.x - lap));
    float swell = sin(vWorld.x * 1.3 + uTime * 1.4 + sin(vWorld.z * 0.33 + uTime * 0.5) * 2.2);
    float crest = smoothstep(0.9, 1.0, swell) * (1.0 - depth) * 0.55;
    float glint = pow(max(0.0, sin(vWorld.x * 3.1 + uTime * 2.0) * sin(vWorld.z * 2.7 - uTime * 1.3)), 14.0);
    col = mix(col, uFoam, clamp(foam + crest, 0.0, 1.0));
    col += glint * uGlint * (0.4 + depth * 0.6);
    gl_FragColor = vec4(col, mix(0.78, 0.95, depth));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

export function Water({ night }: { night: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uShore: { value: SHORE_X },
          uShallow: { value: new THREE.Color() },
          uDeep: { value: new THREE.Color() },
          uFoam: { value: new THREE.Color() },
          uGlint: { value: new THREE.Color() },
        },
      ]),
    [],
  )

  uniforms.uShallow.value.set(night ? '#1d6f86' : '#3fd2c7')
  uniforms.uDeep.value.set(night ? '#071a3a' : '#126f9e')
  uniforms.uFoam.value.set(night ? '#b9d4ff' : '#fffaf0')
  uniforms.uGlint.value.set(night ? '#c8dcff' : '#ffe2a6')

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[-60, WATER_Y, -20]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[260, 260, 1, 1]} />
      <shaderMaterial ref={material} vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={uniforms} transparent fog />
    </mesh>
  )
}
