'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TERRAIN, WATER_Y, sandHeight, terrainColor } from '@/lib/zesto/world'

const WIDTH = TERRAIN.maxX - TERRAIN.minX
const DEPTH = TERRAIN.maxZ - TERRAIN.minZ
const SEG_X = 240
const SEG_Z = 300

export function Sand({ night }: { night: boolean }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WIDTH, DEPTH, SEG_X, SEG_Z)
    geo.rotateX(-Math.PI / 2)
    geo.translate(TERRAIN.minX + WIDTH / 2, 0, TERRAIN.minZ + DEPTH / 2)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = sandHeight(x, z)
      pos.setY(i, y)
      const [r, g, b] = terrainColor(x, z, y)
      c.setRGB(r, g, b, THREE.SRGBColorSpace)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} color={night ? '#c3cbe8' : '#ffffff'} />
    </mesh>
  )
}

const DEPTH_RES_X = 240
const DEPTH_RES_Z = 300
const MAX_DEPTH = 5

function createDepthTexture() {
  const data = new Uint8Array(DEPTH_RES_X * DEPTH_RES_Z * 4)
  for (let j = 0; j < DEPTH_RES_Z; j++) {
    const z = TERRAIN.minZ + (j / (DEPTH_RES_Z - 1)) * DEPTH
    for (let i = 0; i < DEPTH_RES_X; i++) {
      const x = TERRAIN.minX + (i / (DEPTH_RES_X - 1)) * WIDTH
      const depth = Math.min(1, Math.max(0, (WATER_Y - sandHeight(x, z)) / MAX_DEPTH))
      const k = (j * DEPTH_RES_X + i) * 4
      data[k] = data[k + 1] = data[k + 2] = Math.round(depth * 255)
      data[k + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, DEPTH_RES_X, DEPTH_RES_Z, THREE.RGBAFormat)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
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
  uniform sampler2D uDepth;
  uniform vec4 uExtent;
  uniform float uMaxDepth;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uGlint;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  void main() {
    vec2 uv = (vWorld.xz - uExtent.xy) / uExtent.zw;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float d = mix(uMaxDepth, texture2D(uDepth, clamp(uv, 0.0, 1.0)).r * uMaxDepth, inside);
    float depth = smoothstep(0.0, 3.6, d);
    vec3 col = mix(uShallow, uDeep, depth);
    float lap = sin(uTime * 0.8 + vWorld.z * 0.22 + vWorld.x * 0.18) * 0.09;
    float foam = smoothstep(0.32, 0.04, d + lap);
    float swell = sin(vWorld.x * 1.3 + uTime * 1.4 + sin(vWorld.z * 0.33 + uTime * 0.5) * 2.2);
    float crest = smoothstep(0.9, 1.0, swell) * (1.0 - depth) * 0.45;
    float glint = pow(max(0.0, sin(vWorld.x * 3.1 + uTime * 2.0) * sin(vWorld.z * 2.7 - uTime * 1.3)), 14.0);
    col = mix(col, uFoam, clamp(foam + crest, 0.0, 1.0));
    col += glint * uGlint * (0.4 + depth * 0.6);
    gl_FragColor = vec4(col, mix(0.72, 0.95, depth));
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
          uDepth: { value: null },
          uExtent: { value: new THREE.Vector4(TERRAIN.minX, TERRAIN.minZ, WIDTH, DEPTH) },
          uMaxDepth: { value: MAX_DEPTH },
          uShallow: { value: new THREE.Color() },
          uDeep: { value: new THREE.Color() },
          uFoam: { value: new THREE.Color() },
          uGlint: { value: new THREE.Color() },
        },
      ]),
    [],
  )
  const depthTexture = useMemo(createDepthTexture, [])
  uniforms.uDepth.value = depthTexture

  uniforms.uShallow.value.set(night ? '#1d6f86' : '#3fd2c7')
  uniforms.uDeep.value.set(night ? '#071a3a' : '#126f9e')
  uniforms.uFoam.value.set(night ? '#b9d4ff' : '#fffaf0')
  uniforms.uGlint.value.set(night ? '#c8dcff' : '#ffe2a6')

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, WATER_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[420, 420, 1, 1]} />
      <shaderMaterial ref={material} vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={uniforms} transparent fog />
    </mesh>
  )
}
