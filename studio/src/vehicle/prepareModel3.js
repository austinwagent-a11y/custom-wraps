import * as THREE from 'three'
import { addMesh, createPaintMaterial, recenterGroup } from './materials'

function classifyMaterial(name, center) {
  if (name === 'Geohoodsub00021Mtl' || name === 'Georimblurlfsub01Mtl') return 'paint'
  if (name === 'Georimblurlfsub021Mtl') return 'wheel'
  if (name === 'Tire1Mtl' || /tire/i.test(name)) return 'tire'
  if (name === 'Geohoodsub00031Mtl') return 'chrome'
  if (/window|Geodoorl2sub31|Geodoorr2sub31/i.test(name)) {
    return center.z < -1.55 && center.y < 0.95 ? 'lens' : 'glass'
  }
  if (name === 'Ln12Mtl') return 'tail'
  if (name === 'Ln1Mtl') return 'turn'
  if (name === 'Ln7Mtl' && center.z < -1.4) return 'head'
  return 'keep'
}

/** Prepare Model 3 Highland: paint body panels, keep glass/trim intact. */
export function prepareModel3(scene) {
  const root = scene.clone(true)
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const scale = 4.72 / Math.max(box.max.x - box.min.x, 0.001)
  const xform = new THREE.Matrix4()
    .makeRotationY(Math.PI / 2)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z))

  const group = new THREE.Group()
  const paint = createPaintMaterial()
  const paints = [paint]

  root.traverse((obj) => {
    if (!obj.isMesh) return
    const name = obj.material?.name ?? obj.name ?? ''
    const geo = obj.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(xform, obj.matrixWorld))
    geo.computeBoundingBox()
    const kind = classifyMaterial(name, geo.boundingBox.getCenter(new THREE.Vector3()))

    if (kind === 'paint') {
      addMesh(group, geo, paint)
      return
    }

    const mat = obj.material?.clone?.() ?? new THREE.MeshStandardMaterial({ color: '#222' })
    mat.side = THREE.DoubleSide
    if (kind === 'glass' || kind === 'lens') {
      mat.transparent = true
      mat.opacity = kind === 'lens' ? 0.55 : 0.28
      mat.roughness = 0.05
      mat.metalness = 0.04
      mat.color.set(kind === 'lens' ? '#d5e4f6' : '#1a3040')
      mat.depthWrite = kind === 'glass'
      mat.emissive?.set('#000')
    } else if (kind === 'tire') {
      mat.color.set('#141618')
      mat.roughness = 0.92
      mat.metalness = 0
      mat.map = null
    } else if (kind === 'wheel') {
      mat.color.set('#2a3036')
      mat.metalness = 0.88
      mat.roughness = 0.28
      mat.map = null
    } else if (kind === 'chrome') {
      mat.color.set('#c5ccd4')
      mat.metalness = 0.92
      mat.roughness = 0.18
      mat.map = null
    } else if (kind === 'tail') {
      mat.color.set('#8c0714')
      mat.emissive?.set('#ed1828')
      mat.emissiveIntensity = 2.4
    } else if (kind === 'head') {
      mat.color.set('#e7eef8')
      mat.emissive?.set('#d5e4f6')
      mat.emissiveIntensity = 1.2
    } else if (kind === 'turn') {
      mat.emissive?.set('#d6743a')
      mat.emissiveIntensity = 0.6
    }
    addMesh(group, geo, mat)
  })

  recenterGroup(group)
  return { group, paint: paints }
}
