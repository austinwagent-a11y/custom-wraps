import * as THREE from 'three'

const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
whiteTex.colorSpace = THREE.SRGBColorSpace
whiteTex.needsUpdate = true

export const COVERAGE_CODE = { full: 0, twoTone: 1, lower: 2, roof: 3 }
export const BANDS = {
  cybertruck: { lower: 0.62, roof: 1.42 },
  model3: { lower: 0.48, roof: 1.12 },
}

export function finishProps(finish, bareStainless) {
  if (bareStainless) return { metalness: 0.94, roughness: 0.28, clearcoat: 0.22 }
  if (finish === 'matte') return { metalness: 0.02, roughness: 0.78, clearcoat: 0.04 }
  if (finish === 'satin') return { metalness: 0.08, roughness: 0.42, clearcoat: 0.35 }
  if (finish === 'metallic') return { metalness: 0.74, roughness: 0.22, clearcoat: 0.5 }
  if (finish === 'shift') return { metalness: 0.55, roughness: 0.18, clearcoat: 0.7 }
  return { metalness: 0.16, roughness: 0.1, clearcoat: 1 }
}

export function makePatternTexture(film) {
  if (!film.pattern && film.finish !== 'shift') return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = film.color
  ctx.fillRect(0, 0, 512, 512)
  const pattern = film.finish === 'shift' ? 'shift' : film.pattern

  if (pattern === 'camo') {
    const tones = ['#1a1c16', '#8a8474', '#3e4634', '#c4bfb0']
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = tones[i % tones.length]
      ctx.beginPath()
      ctx.ellipse((i * 97) % 512, (i * 61) % 512, 70 + (i % 4) * 24, 40, i, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (pattern === 'stars' || pattern === 'nebula') {
    ctx.fillStyle = pattern === 'nebula' ? '#10161e' : '#0c1016'
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = '#e8eef4'
    for (let i = 0; i < 180; i++) ctx.fillRect((i * 97) % 512, (i * 53) % 512, i % 11 === 0 ? 2 : 1, 1)
  } else if (pattern === 'carbon') {
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = '#2a2a30'
    for (let i = 0; i < 512; i += 8) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(512, i + 4)
      ctx.stroke()
    }
  } else if (pattern === 'hearts' || pattern === 'blossom') {
    ctx.fillStyle = '#fff7f8'
    const count = pattern === 'hearts' ? 28 : 80
    for (let i = 0; i < count; i++) {
      const x = (i * 89) % 512
      const y = (i * 53) % 512
      if (pattern === 'blossom') {
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
        continue
      }
      ctx.beginPath()
      ctx.moveTo(x, y + 5.6)
      ctx.bezierCurveTo(x - 16, y - 4, x - 7.2, y - 15.2, x, y - 4.48)
      ctx.bezierCurveTo(x + 7.2, y - 15.2, x + 16, y - 4, x, y + 5.6)
      ctx.fill()
    }
  } else if (pattern === 'slash' || pattern === 'livery') {
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = '#c1121f'
    ctx.save()
    ctx.translate(256, 256)
    ctx.rotate(-0.6)
    ctx.fillRect(-512, -18, 1024, 36)
    ctx.restore()
  } else if (pattern === 'topo') {
    ctx.strokeStyle = '#c4b08a'
    ctx.lineWidth = 2
    for (let r = 24; r < 240; r += 22) {
      ctx.beginPath()
      ctx.ellipse(256, 256, r * 1.3, r, 0.2, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (pattern === 'shift') {
    const g = ctx.createLinearGradient(0, 0, 512, 0)
    g.addColorStop(0, '#0e3d3a')
    g.addColorStop(0.45, '#14324a')
    g.addColorStop(1, '#3a1860')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 512)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

export function createPaintMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#d5d8de',
    metalness: 0.2,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.05,
    side: THREE.DoubleSide,
  })
  mat.customProgramCacheKey = () => 'ad-wrap-1'
  mat.onBeforeCompile = (shader) => {
    const state = mat.userData.wrapState
    shader.uniforms.uWrapMap = { value: state?.map ?? whiteTex }
    shader.uniforms.uWrapOn = { value: +(!!state?.on) }
    shader.uniforms.uBase = { value: new THREE.Color(state?.base ?? '#d5d8de') }
    shader.uniforms.uCov = { value: state?.cov ?? 0 }
    shader.uniforms.uLower = { value: state?.lower ?? 0.6 }
    shader.uniforms.uRoof = { value: state?.roof ?? 1.3 }
    mat.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWrapPos;
varying vec3 vWrapN;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWrapPos = position;
vWrapN = normal;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWrapPos;
varying vec3 vWrapN;
uniform sampler2D uWrapMap;
uniform float uWrapOn;
uniform vec3 uBase;
uniform float uCov;
uniform float uLower;
uniform float uRoof;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (uWrapOn > 0.5) {
          vec3 bn = abs(normalize(vWrapN));
          bn /= (bn.x + bn.y + bn.z + 1e-4);
          vec3 cx = texture2D(uWrapMap, vWrapPos.zy * 1.15).rgb;
          vec3 cy = texture2D(uWrapMap, vWrapPos.xz * 1.15).rgb;
          vec3 cz = texture2D(uWrapMap, vWrapPos.xy * 1.15).rgb;
          diffuseColor.rgb = cx * bn.x + cy * bn.y + cz * bn.z;
        }
        float mask = 1.0;
        if (uCov > 2.5) {
          mask = smoothstep(uRoof - 0.12, uRoof + 0.05, vWrapPos.y) * smoothstep(0.25, 0.65, vWrapN.y);
        } else if (uCov > 1.5) {
          mask = 1.0 - smoothstep(uLower - 0.06, uLower + 0.1, vWrapPos.y);
        } else if (uCov > 0.5) {
          float roof = smoothstep(uRoof - 0.08, uRoof + 0.06, vWrapPos.y);
          float hood = smoothstep(0.15, -0.85, vWrapPos.z) * smoothstep(uLower, uLower + 0.35, vWrapPos.y);
          mask = max(roof, hood);
        }
        diffuseColor.rgb = mix(uBase, diffuseColor.rgb, mask);`,
      )
  }
  return mat
}

export function applyWrapState(mat, state) {
  mat.userData.wrapState = state
  mat.color.set(state.on ? '#ffffff' : state.color)
  mat.metalness = state.metalness
  mat.roughness = state.roughness
  mat.clearcoat = state.clearcoat
  mat.clearcoatRoughness = state.clearcoat > 0.6 ? 0.05 : 0.18
  const shader = mat.userData.shader
  if (shader) {
    shader.uniforms.uWrapMap.value = state.map ?? whiteTex
    shader.uniforms.uWrapOn.value = +!!state.on
    shader.uniforms.uBase.value.set(state.base)
    shader.uniforms.uCov.value = state.cov
    shader.uniforms.uLower.value = state.lower
    shader.uniforms.uRoof.value = state.roof
  }
}

export function addMesh(group, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)
  return mesh
}

export function recenterGroup(group) {
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  const offset = new THREE.Vector3(-center.x, -box.min.y, -center.z)
  group.traverse((obj) => {
    if (obj.isMesh) obj.geometry.translate(offset.x, offset.y, offset.z)
  })
  group.position.set(0, 0, 0)
}
