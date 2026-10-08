import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getFilm } from '../films'
import { useStudio } from '../store'
import { applyWrapState, BANDS, COVERAGE_CODE, finishProps, makePatternTexture } from './materials'
import { prepareCybertruck } from './prepareCybertruck'
import { prepareModel3 } from './prepareModel3'

useGLTF.preload('/models/cybertruck/model.glb')
useGLTF.preload('/models/highland/model.glb')

function useImageTexture(src) {
  const [tex, setTex] = useState(null)
  useEffect(() => {
    if (!src) {
      setTex(null)
      return undefined
    }
    let live = true
    const loader = new THREE.TextureLoader()
    loader.load(
      src,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        if (live) setTex(t)
      },
      undefined,
      () => {
        if (live) setTex(null)
      },
    )
    return () => {
      live = false
    }
  }, [src])
  useEffect(() => () => tex?.dispose(), [tex])
  return tex
}

function PreparedVehicle({ prepared, vehicle }) {
  const wrapId = useStudio((s) => s.wrapId)
  const finish = useStudio((s) => s.finish)
  const coverage = useStudio((s) => s.coverage)
  const customSrc = useStudio((s) => s.customSrc)
  const film = getFilm(wrapId)
  const patternMap = useMemo(() => (customSrc ? null : makePatternTexture(film)), [film, customSrc])
  const customMap = useImageTexture(customSrc)

  useEffect(() => () => patternMap?.dispose(), [patternMap])

  const bare = film.id === 'stainless' && !customSrc
  const props = finishProps(film.lockFinish ? film.finish : finish, bare && vehicle === 'cybertruck')
  const mapToUse = customMap ?? patternMap

  useLayoutEffect(() => {
    const base = vehicle === 'model3' ? '#f3f3f1' : '#d5d8de'
    const state = {
      color: bare ? base : film.color,
      map: mapToUse ?? null,
      on: !!mapToUse && !bare,
      base,
      cov: bare ? 0 : COVERAGE_CODE[coverage],
      lower: BANDS[vehicle].lower,
      roof: BANDS[vehicle].roof,
      metalness: props.metalness,
      roughness: props.roughness,
      clearcoat: props.clearcoat,
    }
    for (const mat of prepared.paint) applyWrapState(mat, state)
  }, [prepared, vehicle, film, bare, props.metalness, props.roughness, props.clearcoat, mapToUse, coverage])

  return <primitive object={prepared.group} />
}

function CybertruckModel() {
  const gltf = useGLTF('/models/cybertruck/model.glb')
  const prepared = useMemo(() => prepareCybertruck(gltf.scene), [gltf.scene])
  return <PreparedVehicle prepared={prepared} vehicle="cybertruck" />
}

function Model3Model() {
  const gltf = useGLTF('/models/highland/model.glb')
  const prepared = useMemo(() => prepareModel3(gltf.scene), [gltf.scene])
  return <PreparedVehicle prepared={prepared} vehicle="model3" />
}

function CameraRig() {
  const vehicle = useStudio((s) => s.vehicle)
  const { camera, size, controls } = useThree()
  useLayoutEffect(() => {
    const ct = vehicle === 'cybertruck'
    const narrow = size.width / Math.max(size.height, 1) < 0.9
    camera.fov = narrow ? 50 : 28
    camera.updateProjectionMatrix()
    const dist = ct ? (narrow ? 9.4 : 8.1) : narrow ? 7.8 : 6.5
    camera.position.set(dist * 0.52, narrow ? 1.45 : ct ? 1.5 : 1.15, -dist * 0.82)
    if (controls) {
      controls.minDistance = narrow ? 4.2 : ct ? 6.2 : 5
      controls.maxDistance = narrow ? 16 : ct ? 12 : 9.5
      controls.target.set(0, ct ? 0.9 : 0.68, 0)
      controls.update()
    }
  }, [vehicle, size.width, size.height, camera, controls])
  return null
}

function SceneBody() {
  const vehicle = useStudio((s) => s.vehicle)
  const autoRotate = useStudio((s) => s.autoRotate)
  return (
    <>
      <color attach="background" args={['#0a0a0b']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 2]} intensity={1.35} castShadow />
      <directionalLight position={[-6, 3, -4]} intensity={0.45} />
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.9} />
        {vehicle === 'cybertruck' ? <CybertruckModel /> : <Model3Model />}
      </Suspense>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={14} blur={2.4} far={8} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        maxPolarAngle={Math.PI * 0.49}
      />
      <CameraRig />
    </>
  )
}

export default function VehicleScene() {
  return (
    <Canvas
      className="viewport"
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 28, near: 0.1, far: 80, position: [4.2, 1.5, -6.6] }}
      gl={{ antialias: true, toneMappingExposure: 1.05 }}
    >
      <SceneBody />
    </Canvas>
  )
}
