'use client'

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import * as THREE from 'three'
import BodyPartTouchModal from '@/components/client/BodyPartTouchModal'
import { classifyBodyPart, getBodyPartInfo } from '@/lib/bodyPartCatalog'

const MODEL_URL = '/models/character.obj'
const TARGET_HEIGHT = 2.85
const CAMERA_Z_DEFAULT = 5.05
const CAMERA_Z_MIN = 2.4
const CAMERA_Z_MAX = 7
const ROTATE_SENSITIVITY = 0.008
const DRAG_THRESHOLD = 8

/** Escala el modelo y deja su centro geométrico exactamente en (0, 0, 0). */
function normalizeModel(object) {
    object.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(object)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)
    object.position.sub(center)

    const scale = TARGET_HEIGHT / (size.y || 1)
    object.scale.setScalar(scale)

    object.updateMatrixWorld(true)
    const box2 = new THREE.Box3().setFromObject(object)
    const center2 = new THREE.Vector3()
    box2.getCenter(center2)
    object.position.sub(center2)
}

function CharacterMesh({ darkMode, meshRef, touched }) {
    const obj = useLoader(OBJLoader, MODEL_URL)

    const model = useMemo(() => {
        const clone = obj.clone(true)
        clone.traverse(child => {
            if (!child.isMesh) return
            child.castShadow = true
            child.receiveShadow = true
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach((mat, i) => {
                if (!mat || mat.type === 'MeshPhongMaterial' || mat.type === 'MeshLambertMaterial') {
                    const color = darkMode ? '#d4bc6a' : '#9b8242'
                    mats[i] = new THREE.MeshStandardMaterial({
                        color,
                        metalness: 0.15,
                        roughness: 0.55,
                    })
                }
            })
            child.material = Array.isArray(child.material) ? mats : mats[0]
        })
        normalizeModel(clone)
        return clone
    }, [obj, darkMode])

    const baseColor = darkMode ? '#d4bc6a' : '#9b8242'
    const touchColor = darkMode ? '#f0d78c' : '#c9a84c'
    const meshColor = touched ? touchColor : baseColor

    useLayoutEffect(() => {
        model.traverse(child => {
            if (!child.isMesh) return
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            mats.forEach(mat => {
                if (mat?.color) mat.color.set(meshColor)
            })
        })
    }, [model, meshColor])

    useLayoutEffect(() => {
        return () => {
            model.traverse(child => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material]
                    mats.forEach(m => m?.dispose?.())
                }
            })
        }
    }, [model])

    return <primitive ref={meshRef} object={model} />
}

function ViewerScene({ darkMode, onActivePartChange, activePart }) {
    const meshRef = useRef(null)
    const spinRef = useRef(null)
    const dragging = useRef(false)
    const rotating = useRef(false)
    const lastX = useRef(0)
    const downX = useRef(0)
    const raycaster = useMemo(() => new THREE.Raycaster(), [])
    const pointer = useMemo(() => new THREE.Vector2(), [])
    const localPoint = useMemo(() => new THREE.Vector3(), [])
    const { camera, gl } = useThree()

    useLayoutEffect(() => {
        camera.position.set(0, 0, CAMERA_Z_DEFAULT)
        camera.up.set(0, 1, 0)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
    }, [camera])

    const pickBodyPart = (clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect()
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        if (!meshRef.current) return null
        const hits = raycaster.intersectObject(meshRef.current, true)
        if (!hits.length) return null
        localPoint.copy(hits[0].point)
        if (spinRef.current) spinRef.current.worldToLocal(localPoint)
        const partId = classifyBodyPart(localPoint)
        return getBodyPartInfo(partId)
    }

    useEffect(() => {
        const el = gl.domElement

        const onPointerDown = (e) => {
            if (e.button !== 0) return
            dragging.current = true
            rotating.current = false
            downX.current = e.clientX
            lastX.current = e.clientX
            const part = pickBodyPart(e.clientX, e.clientY)
            onActivePartChange(part)
            el.setPointerCapture(e.pointerId)
        }

        const onPointerMove = (e) => {
            if (!dragging.current || !spinRef.current) return
            const dxTotal = e.clientX - downX.current
            if (!rotating.current && Math.abs(dxTotal) > DRAG_THRESHOLD) {
                rotating.current = true
                onActivePartChange(null)
            }
            if (!rotating.current) return
            const dx = e.clientX - lastX.current
            lastX.current = e.clientX
            spinRef.current.rotation.y += dx * ROTATE_SENSITIVITY
        }

        const endDrag = (e) => {
            dragging.current = false
            rotating.current = false
            onActivePartChange(null)
            if (el.hasPointerCapture(e.pointerId)) {
                el.releasePointerCapture(e.pointerId)
            }
        }

        const onWheel = (e) => {
            e.preventDefault()
            const nextZ = THREE.MathUtils.clamp(
                camera.position.z + e.deltaY * 0.004,
                CAMERA_Z_MIN,
                CAMERA_Z_MAX,
            )
            camera.position.set(0, 0, nextZ)
            camera.lookAt(0, 0, 0)
        }

        el.addEventListener('pointerdown', onPointerDown)
        el.addEventListener('pointermove', onPointerMove)
        el.addEventListener('pointerup', endDrag)
        el.addEventListener('pointercancel', endDrag)
        el.addEventListener('wheel', onWheel, { passive: false })

        return () => {
            el.removeEventListener('pointerdown', onPointerDown)
            el.removeEventListener('pointermove', onPointerMove)
            el.removeEventListener('pointerup', endDrag)
            el.removeEventListener('pointercancel', endDrag)
            el.removeEventListener('wheel', onWheel)
        }
    }, [camera, gl, onActivePartChange, raycaster, pointer, localPoint])

    return (
        <group ref={spinRef}>
            <CharacterMesh
                darkMode={darkMode}
                meshRef={meshRef}
                touched={Boolean(activePart)}
            />
        </group>
    )
}

class ModelErrorBoundary extends Component {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }
        return this.props.children
    }
}

export default function CharacterModelViewer({ darkMode, hint }) {
    const bg = darkMode ? '#111827' : '#f2efe8'
    const viewerHeight = 'clamp(320px, 58vh, 560px)'
    const [activePart, setActivePart] = useState(null)

    const fallback = (
        <div
            className="flex w-full items-center justify-center p-6 text-center text-sm text-red-400"
            style={{ height: viewerHeight }}
        >
            No se pudo cargar el modelo 3D. Revisa que exista{' '}
            <code className="mx-1 rounded bg-black/20 px-1">public/models/character.obj</code>.
        </div>
    )

    return (
        <ModelErrorBoundary fallback={fallback}>
            <div className="relative w-full" style={{ height: viewerHeight }}>
                {hint ? (
                    <p
                        className={`pointer-events-none absolute left-0 right-0 top-0 z-10 border-b px-5 py-3 text-sm backdrop-blur-sm sm:px-6 ${
                            darkMode
                                ? 'border-gray-700/60 bg-[#111827]/75 text-gray-400'
                                : 'border-[#E5DECF]/80 bg-[#f2efe8]/85 text-gray-600'
                        }`}
                    >
                        {hint}
                    </p>
                ) : null}

                <BodyPartTouchModal part={activePart} darkMode={darkMode} />

                <Canvas
                    shadows
                    className={`block h-full w-full touch-none ${
                        activePart ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                    }`}
                    camera={{ position: [0, 0, CAMERA_Z_DEFAULT], fov: 39, near: 0.1, far: 50 }}
                    gl={{ antialias: true, alpha: false }}
                    style={{ width: '100%', height: '100%', background: bg }}
                    dpr={[1, 2]}
                >
                    <color attach="background" args={[bg]} />
                    <ambientLight intensity={0.55} />
                    <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
                    <directionalLight position={[-3, 2, -2]} intensity={0.35} />
                    <Suspense fallback={null}>
                        <ViewerScene
                            darkMode={darkMode}
                            activePart={activePart}
                            onActivePartChange={setActivePart}
                        />
                    </Suspense>
                </Canvas>
                <p
                    className={`pointer-events-none absolute bottom-3 left-0 right-0 z-10 text-center text-xs ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                >
                    Mantén pulsado una zona · arrastra para girar · scroll para acercar
                </p>
            </div>
        </ModelErrorBoundary>
    )
}
