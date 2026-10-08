import * as THREE from 'three'
import { addMesh, createPaintMaterial, recenterGroup } from './materials'

function classifyTriangle(px, py, pz, nx, ny, nz) {
  // The source GLB merges tires, glazing and body into one steel material.
  // Classify in normalized vehicle coordinates, including back-facing glass.
  const wheelDistance = Math.min(Math.hypot(pz + 2.02, py - 0.49), Math.hypot(pz - 1.7, py - 0.49))
  if (Math.abs(px) > 0.66 && wheelDistance < 0.5) return 'trim'
  if (py < 0.4 || (Math.abs(px) > 0.85 && wheelDistance < 0.62)) return 'trim'
  const glass =
    (Math.abs(ny) > 0.75 && Math.abs(nz) > 0.2 && py > 1.38 && pz < -0.45 && pz > -1.55 && Math.abs(px) < 0.65) ||
    (Math.abs(nx) > 0.85 && Math.abs(ny) < 0.4 && py > 1.34 && py < 1.73 && pz > -0.95 && pz < 0.7 && Math.abs(px) > 0.6) ||
    (Math.abs(nz) > 0.6 && py > 1.28 && py < 1.62 && pz > 0.55 && pz < 1.15 && Math.abs(px) < 0.72)
  if (glass) return 'glass'
  if (py > 1.12 && py < 1.22 && pz < -2.45 && Math.abs(px) < 0.85 && nz < -0.85) return 'head'
  if (py > 1.12 && py < 1.32 && pz > 2.45 && Math.abs(px) < 0.9 && nz > 0.85) return 'tail'
  return 'paint'
}

function splitGeometry(group, geometry, paintMat) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const pos = source.getAttribute('position')
  const nor = source.getAttribute('normal')
  const uv = source.getAttribute('uv')
  if (!pos || !nor) {
    addMesh(group, geometry, paintMat)
    return
  }

  const buckets = new Map()
  const bucket = (key) => {
    let b = buckets.get(key)
    if (!b) {
      b = { positions: [], normals: [], uvs: [] }
      buckets.set(key, b)
    }
    return b
  }

  for (let i = 0; i < pos.count; i += 3) {
    let px = 0
    let py = 0
    let pz = 0
    let nx = 0
    let ny = 0
    let nz = 0
    for (let k = 0; k < 3; k++) {
      px += pos.getX(i + k)
      py += pos.getY(i + k)
      pz += pos.getZ(i + k)
      nx += nor.getX(i + k)
      ny += nor.getY(i + k)
      nz += nor.getZ(i + k)
    }
    const key = classifyTriangle(px / 3, py / 3, pz / 3, nx / 3, ny / 3, nz / 3)
    const b = bucket(key)
    for (let k = 0; k < 3; k++) {
      const idx = i + k
      b.positions.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx))
      b.normals.push(nor.getX(idx), nor.getY(idx), nor.getZ(idx))
      b.uvs.push(uv ? uv.getX(idx) : 0, uv ? uv.getY(idx) : 0)
    }
  }

  if (source !== geometry) source.dispose()
  geometry.dispose()

  const mats = new Map([['paint', paintMat]])
  for (const [key, data] of buckets) {
    if (!data.positions.length) continue
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2))

    let mat = mats.get(key)
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide })
      if (key === 'trim') {
        mat.color.set('#16181a')
        mat.roughness = 0.85
        mat.metalness = 0.08
      } else if (key === 'glass') {
        mat.transparent = true
        mat.opacity = 0.82
        mat.roughness = 0.05
        mat.metalness = 0.06
        mat.color.set('#1a3040')
        mat.depthWrite = true
      } else if (key === 'head') {
        mat.color.set('#e7eef8')
        mat.emissive.set('#edf5ff')
        mat.emissiveIntensity = 2.2
      } else if (key === 'tail') {
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
