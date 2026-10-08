import * as THREE from 'three'
import { addMesh, createPaintMaterial, recenterGroup } from './materials'

const KEY_PAINT = 0
const KEY_GLASS = 1
const KEY_HEAD = 2
const KEY_TAIL = 3
const KEY_TRIM = 4

function classifyTriangle(px, py, pz, nx, ny, nz) {
  // The source GLB merges tires, glazing and body into one steel material.
  // Classify in normalized vehicle coordinates, including back-facing glass.
  const wheelDistance = Math.min(Math.hypot(pz + 2.02, py - 0.49), Math.hypot(pz - 1.7, py - 0.49))
  if (Math.abs(px) > 0.66 && wheelDistance < 0.5) return KEY_TRIM
  if (py < 0.4 || (Math.abs(px) > 0.85 && wheelDistance < 0.62)) return KEY_TRIM
  const glass =
    (Math.abs(ny) > 0.75 && Math.abs(nz) > 0.2 && py > 1.38 && pz < -0.45 && pz > -1.55 && Math.abs(px) < 0.65) ||
    (Math.abs(nx) > 0.85 && Math.abs(ny) < 0.4 && py > 1.34 && py < 1.73 && pz > -0.95 && pz < 0.7 && Math.abs(px) > 0.6) ||
    (Math.abs(nz) > 0.6 && py > 1.28 && py < 1.62 && pz > 0.55 && pz < 1.15 && Math.abs(px) < 0.72)
  if (glass) return KEY_GLASS
  if (py > 1.12 && py < 1.22 && pz < -2.45 && Math.abs(px) < 0.85 && nz < -0.85) return KEY_HEAD
  if (py > 1.12 && py < 1.32 && pz > 2.45 && Math.abs(px) < 0.9 && nz > 0.85) return KEY_TAIL
  return KEY_PAINT
}

function splitGeometry(group, geometry, paintMat) {
  const posAttr = geometry.getAttribute('position')
  const norAttr = geometry.getAttribute('normal')
  const uvAttr = geometry.getAttribute('uv')
  if (!posAttr || !norAttr) {
    addMesh(group, geometry, paintMat)
    return
  }

  const pos = posAttr.array
  const nor = norAttr.array
  const uvs = uvAttr?.array
  const index = geometry.index?.array
  const triCount = index ? index.length / 3 : posAttr.count / 3
  const keys = new Uint8Array(triCount)
  const counts = [0, 0, 0, 0, 0]

  for (let t = 0; t < triCount; t++) {
    const base = t * 3
    let i0
    let i1
    let i2
    if (index) {
      i0 = index[base]
      i1 = index[base + 1]
      i2 = index[base + 2]
    } else {
      i0 = base
      i1 = base + 1
      i2 = base + 2
    }
    const i0_3 = i0 * 3
    const i1_3 = i1 * 3
    const i2_3 = i2 * 3
    const px = (pos[i0_3] + pos[i1_3] + pos[i2_3]) / 3
    const py = (pos[i0_3 + 1] + pos[i1_3 + 1] + pos[i2_3 + 1]) / 3
    const pz = (pos[i0_3 + 2] + pos[i1_3 + 2] + pos[i2_3 + 2]) / 3
    const nx = (nor[i0_3] + nor[i1_3] + nor[i2_3]) / 3
    const ny = (nor[i0_3 + 1] + nor[i1_3 + 1] + nor[i2_3 + 1]) / 3
    const nz = (nor[i0_3 + 2] + nor[i1_3 + 2] + nor[i2_3 + 2]) / 3
    const key = classifyTriangle(px, py, pz, nx, ny, nz)
    keys[t] = key
    counts[key]++
  }

  const buckets = counts.map((n) => ({
    positions: new Float32Array(n * 9),
    normals: new Float32Array(n * 9),
    uvs: new Float32Array(n * 6),
    cursor: 0,
  }))

  for (let t = 0; t < triCount; t++) {
    const b = buckets[keys[t]]
    const base = t * 3
    let i0
    let i1
    let i2
    if (index) {
      i0 = index[base]
      i1 = index[base + 1]
      i2 = index[base + 2]
    } else {
      i0 = base
      i1 = base + 1
      i2 = base + 2
    }
    const pc = b.cursor * 9
    const uc = b.cursor * 6
    const verts = [i0, i1, i2]
    for (let k = 0; k < 3; k++) {
      const ia = verts[k] * 3
      const ib = verts[k] * 2
      const o = pc + k * 3
      b.positions[o] = pos[ia]
      b.positions[o + 1] = pos[ia + 1]
      b.positions[o + 2] = pos[ia + 2]
      b.normals[o] = nor[ia]
      b.normals[o + 1] = nor[ia + 1]
      b.normals[o + 2] = nor[ia + 2]
      b.uvs[uc + k * 2] = uvs ? uvs[ib] : 0
      b.uvs[uc + k * 2 + 1] = uvs ? uvs[ib + 1] : 0
    }
    b.cursor++
  }

  geometry.dispose()

  const mats = new Map([[KEY_PAINT, paintMat]])
  for (let key = 0; key < 5; key++) {
    const data = buckets[key]
    if (!data.cursor) continue
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))

    let mat = mats.get(key)
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide })
      if (key === KEY_TRIM) {
        mat.color.set('#16181a')
        mat.roughness = 0.85
        mat.metalness = 0.08
      } else if (key === KEY_GLASS) {
        mat.transparent = true
        mat.opacity = 0.82
        mat.roughness = 0.05
        mat.metalness = 0.06
        mat.color.set('#1a3040')
        mat.depthWrite = true
      } else if (key === KEY_HEAD) {
        mat.color.set('#e7eef8')
        mat.emissive.set('#edf5ff')
        mat.emissiveIntensity = 2.2
      } else if (key === KEY_TAIL) {
        mat.color.set('#8c0714')
        mat.emissive.set('#ed1828')
        mat.emissiveIntensity = 2.6
      }
      mats.set(key, mat)
    }
    addMesh(group, geo, mat)
  }
}

/** Prepare Cybertruck: body paint + glass/lights separated by triangle normals. */
export function prepareCybertruck(scene) {
  const root = scene.clone(true)
  root.updateMatrixWorld(true)
  const worldBox = new THREE.Box3().setFromObject(root)
  const height = worldBox.max.y - worldBox.min.y
  const skip = new Set()
  const bodyBox = new THREE.Box3()

  root.traverse((obj) => {
    if (!obj.isMesh) return
    const box = new THREE.Box3().setFromObject(obj)
    const tris = (obj.geometry.index?.count ?? obj.geometry.getAttribute('position').count) / 3
    if (tris < 500 && box.min.y > worldBox.min.y + height * 0.55) skip.add(obj)
    else bodyBox.union(box)
  })

  const spanX = bodyBox.max.x - bodyBox.min.x
  const midX = (bodyBox.max.x + bodyBox.min.x) / 2
  const scaleX = spanX > 0.2 && spanX < 2.03 ? 2.03 / spanX : 1
  const xform = new THREE.Matrix4()
    .makeRotationY(Math.PI)
    .multiply(new THREE.Matrix4().makeScale(scaleX, 1, 1))
    .multiply(new THREE.Matrix4().makeTranslation(-midX, 0, 0))

  const group = new THREE.Group()
  const paint = createPaintMaterial()
  // The GLB includes opposing faces; rendering both sides causes z-fighting.
  paint.side = THREE.FrontSide

  root.traverse((obj) => {
    if (!obj.isMesh || skip.has(obj)) return
    const geo = obj.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(xform, obj.matrixWorld))
    splitGeometry(group, geo, paint)
  })

  recenterGroup(group)
  return { group, paint: [paint] }
}
