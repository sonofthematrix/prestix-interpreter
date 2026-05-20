'use client';

import type { Engine, Mesh, ParticleSystem, Scene } from '@babylonjs/core';
import { useEffect, useRef, useState } from 'react';

type AnimState = 'idle' | 'listening' | 'speaking' | 'translating' | 'error';

interface Props {
    state?: AnimState;
    className?: string;
}

type RenderMode = 'pending' | 'babylon' | 'fallback';

function fallbackAccent(state: AnimState): { glow: string; ring: string } {
    switch (state) {
        case 'listening':
            return {
                glow: 'rgba(34, 211, 238, 0.32)',
                ring: 'rgba(125, 211, 252, 0.26)',
            };
        case 'speaking':
            return {
                glow: 'rgba(56, 189, 248, 0.28)',
                ring: 'rgba(103, 232, 249, 0.24)',
            };
        case 'translating':
            return {
                glow: 'rgba(59, 130, 246, 0.24)',
                ring: 'rgba(96, 165, 250, 0.22)',
            };
        case 'error':
            return {
                glow: 'rgba(248, 113, 113, 0.22)',
                ring: 'rgba(239, 68, 68, 0.2)',
            };
        default:
            return {
                glow: 'rgba(14, 165, 233, 0.2)',
                ring: 'rgba(56, 189, 248, 0.18)',
            };
    }
}

function detectWebglSupport(canvas: HTMLCanvasElement): boolean {
    const names: Array<'webgl2' | 'webgl' | 'experimental-webgl'> = ['webgl2', 'webgl', 'experimental-webgl'];
    for (const name of names) {
        try {
            const context = canvas.getContext(name, {
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance',
            } as CanvasRenderingContext2DSettings);
            if (context) {
                return true;
            }
        } catch {
            // Ignore and try the next context.
        }
    }

    return false;
}

/**
 * Jarvis-style autonomous 3D backdrop — self-animating Babylon.js scene.
 * Cycles through visual phases autonomously, enhanced by voice state.
 *
 * Autonomous phases:
 *   calm     → slow orbit, gentle blue pulse
 *   curious  → rings reconfigure, orange/gold accent
 *   active   → faster rotation, bright cyan burst
 *   alert    → rings expand, particle shower
 *
 * Voice state overrides:
 *   listening → core brightens, rings expand, particles
 *   speaking  → waveform oscillation on rings
 *   error     → red pulse
 */
export function PrestixBabylonBackdrop({ state = 'idle', className }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<AnimState>(state);
    const [renderMode, setRenderMode] = useState<RenderMode>('pending');
    stateRef.current = state;

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        let disposed = false;
        let teardown: (() => void) | null = null;

        const activateFallback = (reason: string, error?: unknown) => {
            if (!disposed) {
                setRenderMode('fallback');
            }

            if (error) {
                console.error(`[PrestixBabylonBackdrop] ${reason}:`, error);
                return;
            }

            console.warn(`[PrestixBabylonBackdrop] ${reason}`);
        };

        const onContextCreationError = (event: Event) => {
            const statusMessage =
                typeof event === 'object' && event !== null && 'statusMessage' in event
                    ? String((event as { statusMessage?: unknown }).statusMessage ?? '')
                    : '';
            activateFallback(
                statusMessage
                    ? `WebGL context creation failed (${statusMessage})`
                    : 'WebGL context creation failed',
            );
        };

        const onContextLost = (event: Event) => {
            event.preventDefault();
            teardown?.();
            teardown = null;
            activateFallback('WebGL context lost');
        };

        canvas.addEventListener('webglcontextcreationerror', onContextCreationError as EventListener);
        canvas.addEventListener('webglcontextlost', onContextLost as EventListener);

        if (!detectWebglSupport(canvas)) {
            activateFallback('WebGL not supported');
            return () => {
                disposed = true;
                canvas.removeEventListener('webglcontextcreationerror', onContextCreationError as EventListener);
                canvas.removeEventListener('webglcontextlost', onContextLost as EventListener);
            };
        }

        import('@babylonjs/core').then((B) => {
            if (disposed) return;

            try {
                const engine = new B.Engine(canvas, true, {
                    preserveDrawingBuffer: false,
                    stencil: true,
                    antialias: true,
                    alpha: true,
                    premultipliedAlpha: false,
                    disableWebGL2Support: true,
                    powerPreference: 'high-performance',
                });

                setRenderMode('babylon');

                const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
                engine.setHardwareScalingLevel(1 / Math.min(Math.max(dpr, 1), 2));

                const scene = new B.Scene(engine);
                scene.clearColor = new B.Color4(0, 0, 0, 0);

                // ── Camera ──
                const camera = new B.ArcRotateCamera(
                    'cam', Math.PI * 0.48, Math.PI / 2.3, 14,
                    new B.Vector3(0, 0.6, 0), scene,
                );
                scene.activeCamera = camera;
                camera.lowerRadiusLimit = 10;
                camera.upperRadiusLimit = 22;

                // ── Lighting ──
                const hemi = new B.HemisphericLight('hemi', new B.Vector3(0, 1, 0), scene);
                hemi.intensity = 0.55;
                const dir = new B.DirectionalLight('dir', new B.Vector3(0.4, -0.9, -0.3), scene);
                dir.position = new B.Vector3(-6, 12, -7);
                dir.intensity = 0.6;

                // ── JARVIS CORE ──
                const core = B.MeshBuilder.CreateIcoSphere('core', { radius: 0.55, subdivisions: 3 }, scene);
                core.position.y = 0.75;
                const coreMat = new B.StandardMaterial('coreMat', scene);
                coreMat.diffuseColor = new B.Color3(0.08, 0.25, 0.5);
                coreMat.emissiveColor = new B.Color3(0.15, 0.55, 1);
                coreMat.alpha = 0.85;
                core.material = coreMat;

                const innerCore = B.MeshBuilder.CreateIcoSphere('inner', { radius: 0.28, subdivisions: 2 }, scene);
                innerCore.parent = core;
                const innerMat = new B.StandardMaterial('innerMat', scene);
                innerMat.diffuseColor = new B.Color3(0.2, 0.5, 0.9);
                innerMat.emissiveColor = new B.Color3(0.3, 0.7, 1);
                innerMat.alpha = 0.9;
                innerCore.material = innerMat;

                // ── ORBIT RINGS ──
                const rings: Mesh[] = [];
                const ringMats: any[] = [];

                for (let i = 0; i < 3; i++) {
                    const ring = B.MeshBuilder.CreateTorus(
                        `ring${i}`, { diameter: 1.8 + i * 1.1, thickness: 0.03 + i * 0.015, tessellation: 64 }, scene,
                    );
                    ring.position.y = 0.75;
                    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
                    ring.rotation.y = i * 0.4;

                    const rMat = new B.StandardMaterial(`ringMat${i}`, scene);
                    rMat.diffuseColor = new B.Color3(0.05, 0.18, 0.4);
                    rMat.emissiveColor = new B.Color3(0.1, 0.4, 0.7 + i * 0.15);
                    rMat.alpha = 0.55 - i * 0.12;
                    rMat.wireframe = i === 2;
                    ring.material = rMat;
                    rings.push(ring);
                    ringMats.push(rMat);
                }

                // ── FLOATING PANELS ──
                const panelMat = new B.StandardMaterial('panelMat', scene);
                panelMat.diffuseColor = new B.Color3(0.04, 0.1, 0.18);
                panelMat.emissiveColor = new B.Color3(0.06, 0.2, 0.4);
                panelMat.alpha = 0.4;
                panelMat.backFaceCulling = false;

                const panels: Mesh[] = [];
                for (let i = 0; i < 10; i++) {
                    const box = B.MeshBuilder.CreateBox(`p${i}`, { width: 1.8, height: 2.8, depth: 0.05 }, scene);
                    const a = (i / 10) * Math.PI * 2;
                    const r = 6.8;
                    box.position = new B.Vector3(Math.cos(a) * r, 1.6 + Math.sin(i * 0.8) * 0.4, Math.sin(a) * r);
                    box.rotation.y = -a + Math.PI / 2;
                    box.material = panelMat;
                    panels.push(box);
                }

                // ── PARTICLES ──
                let particleSystem: ParticleSystem | null = null;
                try {
                    particleSystem = new B.ParticleSystem('ps', 200, scene);
                    particleSystem.particleTexture = new B.Texture(
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1" fill="white"/></svg>',
                        scene,
                    );
                    particleSystem.emitter = new B.Vector3(0, 1.2, 0);
                    particleSystem.minEmitBox = new B.Vector3(-1.5, -0.5, -1.5);
                    particleSystem.maxEmitBox = new B.Vector3(1.5, 1.5, 1.5);
                    particleSystem.color1 = new B.Color4(0.1, 0.4, 0.9, 0.6);
                    particleSystem.color2 = new B.Color4(0.2, 0.6, 1, 0.3);
                    particleSystem.colorDead = new B.Color4(0, 0.1, 0.3, 0);
                    particleSystem.minSize = 0.02;
                    particleSystem.maxSize = 0.08;
                    particleSystem.minLifeTime = 0.6;
                    particleSystem.maxLifeTime = 1.4;
                    particleSystem.emitRate = 0;
                    particleSystem.gravity = new B.Vector3(0, 0.1, 0);
                    particleSystem.blendMode = B.ParticleSystem.BLENDMODE_ADD;
                } catch { /* optional */ }

                // ── GROUND ──
                const ground = B.MeshBuilder.CreateGround('g', { width: 30, height: 30, subdivisions: 1 }, scene);
                ground.position.y = -0.5;
                const gMat = new B.StandardMaterial('gMat', scene);
                gMat.diffuseColor = new B.Color3(0.02, 0.04, 0.08);
                gMat.emissiveColor = new B.Color3(0.02, 0.06, 0.12);
                gMat.alpha = 0.7;
                ground.material = gMat;

                const reduced =
                    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                // ═══════════════════════════════════════
                //  AUTONOMOUS PHASE CYCLE
                // ═══════════════════════════════════════
                type AutoPhase = 'calm' | 'curious' | 'active' | 'alert';
                let autoPhase: AutoPhase = 'calm';
                let phaseTimer = 0;
                const PHASE_DURATION = 12; // seconds per autonomous phase

                // ═══════════════════════════════════════
                //  ANIMATION LOOP
                // ═══════════════════════════════════════
                let t = 0;
                let errorFlash = 0;

                scene.registerBeforeRender(() => {
                    if (reduced) return;
                    const dt = engine.getDeltaTime() * 0.001;
                    t += dt;
                    const s = stateRef.current;

                    // ── Autonomous phase cycling ──
                    phaseTimer += dt;
                    if (phaseTimer > PHASE_DURATION) {
                        phaseTimer = 0;
                        const phases: AutoPhase[] = ['calm', 'curious', 'active', 'alert'];
                        const idx = phases.indexOf(autoPhase);
                        autoPhase = phases[(idx + 1) % phases.length];
                    }

                    // Slow orbit always
                    camera.alpha += 0.00005;
                    core.rotation.y += dt * 0.4;
                    core.rotation.x += dt * 0.15;

                    // ── Color palette: auto-phase → defaults, voice-state → overrides ──
                    interface Palette { r: number; g: number; b: number; a: number }
                    let coreColor: Palette = { r: 0.15, g: 0.55, b: 1, a: 1 };
                    let ringColor: Palette = { r: 0.1, g: 0.4, b: 0.7, a: 1 };
                    let ringSpeed = 0.15;
                    let corePulse = 1;
                    let ringScale = 1;
                    let particleRate = 0;
                    let panelGlow = 0.4;

                    // Auto-phase defaults
                    switch (autoPhase) {
                        case 'calm':
                            coreColor = { r: 0.15, g: 0.55, b: 1, a: 1 };
                            ringColor = { r: 0.1, g: 0.4, b: 0.7, a: 1 };
                            corePulse = 1 + Math.sin(t * 0.8) * 0.06;
                            ringScale = 1 + Math.sin(t * 0.6) * 0.02;
                            particleRate = 0;
                            panelGlow = 0.4;
                            break;
                        case 'curious':
                            coreColor = { r: 0.55, g: 0.3, b: 0.1, a: 1 };
                            ringColor = { r: 0.5, g: 0.25, b: 0.08, a: 1 };
                            ringSpeed = 0.22;
                            corePulse = 1 + Math.sin(t * 1.4) * 0.1;
                            ringScale = 1 + Math.sin(t * 1.2) * 0.04;
                            particleRate = 8;
                            panelGlow = 0.5;
                            // Reconfigure ring angles during curious phase
                            rings.forEach((r, i) => {
                                const target = Math.PI / 2 + (i - 1) * 0.55;
                                r.rotation.x += (target - r.rotation.x) * dt * 0.5;
                                r.rotation.y += (i * 0.7 - r.rotation.y) * dt * 0.5;
                            });
                            break;
                        case 'active':
                            coreColor = { r: 0.05, g: 0.7, b: 0.85, a: 1 };
                            ringColor = { r: 0.05, g: 0.6, b: 0.75, a: 1 };
                            ringSpeed = 0.35;
                            corePulse = 1 + Math.sin(t * 3) * 0.15;
                            ringScale = 1 + Math.sin(t * 2.5) * 0.06;
                            particleRate = 25;
                            panelGlow = 0.7;
                            break;
                        case 'alert':
                            coreColor = { r: 0.7, g: 0.55, b: 0.15, a: 1 };
                            ringColor = { r: 0.6, g: 0.45, b: 0.1, a: 1 };
                            ringSpeed = 0.5;
                            corePulse = 1 + Math.abs(Math.sin(t * 5)) * 0.2;
                            ringScale = 1 + Math.sin(t * 4) * 0.1;
                            particleRate = 60;
                            panelGlow = 0.9;
                            break;
                    }

                    // ── Voice state overrides (blend on top of auto-phase) ──
                    switch (s) {
                        case 'listening':
                            coreColor = { r: 0.15, g: 0.65, b: 1, a: 1 };
                            corePulse = 1 + Math.sin(t * 4) * 0.2;
                            ringSpeed = 0.3;
                            ringScale = 1 + Math.sin(t * 3) * 0.08;
                            particleRate = Math.max(particleRate, 30);
                            break;
                        case 'speaking':
                            coreColor = { r: 0.2, g: 0.7, b: 1, a: 1 };
                            corePulse = 1 + Math.sin(t * 8) * 0.08;
                            ringScale = 1 + Math.sin(t * 6) * 0.1;
                            ringSpeed = 0.45;
                            particleRate = Math.max(particleRate, 60);
                            // Waveform oscillation on rings
                            rings.forEach((rng, i) => {
                                rng.position.y = 0.75 + Math.sin(t * 5 + i * 1.5) * 0.12;
                            });
                            break;
                        case 'translating':
                            coreColor = { r: 0.12, g: 0.5, b: 0.8, a: 1 };
                            corePulse = 1 + Math.sin(t * 1.8) * 0.1;
                            particleRate = Math.max(particleRate, 12);
                            break;
                        case 'error':
                            errorFlash += dt;
                            const err = Math.sin(errorFlash * 12) * 0.5 + 0.5;
                            coreColor = { r: 0.9 * err, g: 0.15, b: 0.15, a: 1 };
                            ringColor = { r: 0.6 * err, g: 0.1, b: 0.1, a: 1 };
                            corePulse = 1 + err * 0.12;
                            ringSpeed = 0.5;
                            particleRate = 20;
                            break;
                    }

                    // Reset ring Y positions if not speaking
                    if (s !== 'speaking') {
                        rings.forEach((rng) => {
                            rng.position.y += (0.75 - rng.position.y) * dt * 2;
                        });
                    }

                    // ── Apply to scene objects ──
                    coreMat.emissiveColor = new B.Color3(coreColor.r, coreColor.g, coreColor.b);
                    innerMat.emissiveColor = new B.Color3(coreColor.r * 1.5, coreColor.g * 1.3, coreColor.b * 1.1);
                    core.scaling.setAll(corePulse);

                    rings.forEach((rng, i) => {
                        rng.rotation.z += dt * ringSpeed;
                        rng.scaling.setAll(ringScale + Math.sin(t * 3 + i) * 0.01);
                    });
                    ringMats.forEach((mat: any) => {
                        mat.emissiveColor = new B.Color3(ringColor.r, ringColor.g, ringColor.b);
                    });

                    panelMat.emissiveColor = new B.Color3(
                        coreColor.r * 0.3,
                        coreColor.g * 0.4,
                        coreColor.b * panelGlow,
                    );

                    if (particleSystem) {
                        particleSystem.emitRate = particleSystem.emitRate * 0.8 + particleRate * 0.2;
                    }
                });

                engine.runRenderLoop(() => scene.render());

                const syncSize = () => { try { engine.resize(); } catch { /* ignore */ } };
                requestAnimationFrame(() => { syncSize(); requestAnimationFrame(syncSize); });

                let ro: ResizeObserver | null = null;
                if (typeof ResizeObserver !== 'undefined') {
                    ro = new ResizeObserver(() => syncSize());
                    ro.observe(wrap);
                }
                const onResize = () => syncSize();
                window.addEventListener('resize', onResize);

                teardown = () => {
                    ro?.disconnect();
                    window.removeEventListener('resize', onResize);
                    particleSystem?.dispose();
                    scene.dispose();
                    engine.dispose();
                };

                if (disposed) { teardown(); teardown = null; }
            } catch (err: unknown) {
                activateFallback('WebGL init failed', err);
            }
        }).catch((err: unknown) => {
            activateFallback('Babylon failed to load', err);
        });

        return () => {
            disposed = true;
            canvas.removeEventListener('webglcontextcreationerror', onContextCreationError as EventListener);
            canvas.removeEventListener('webglcontextlost', onContextLost as EventListener);
            teardown?.();
        };
    }, []);

    const accent = fallbackAccent(state);

    return (
        <div ref={wrapRef} className={className} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'radial-gradient(circle at 50% 36%, rgba(56,189,248,0.18), transparent 20%), linear-gradient(180deg, rgba(2,6,23,0.72), rgba(2,6,23,0.94))',
                    opacity: renderMode === 'babylon' ? 0.3 : 1,
                    transition: 'opacity 220ms ease',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: '18% 12%',
                    borderRadius: '9999px',
                    background: `radial-gradient(circle, ${accent.glow} 0%, transparent 58%)`,
                    filter: 'blur(32px)',
                    opacity: renderMode === 'babylon' ? 0.18 : 0.88,
                    transition: 'opacity 220ms ease',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: '24% 20%',
                    borderRadius: '9999px',
                    border: `1px solid ${accent.ring}`,
                    boxShadow: `0 0 80px ${accent.ring}`,
                    opacity: renderMode === 'babylon' ? 0.14 : 0.72,
                    transition: 'opacity 220ms ease',
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    width: renderMode === 'fallback' ? 0 : '100%',
                    height: renderMode === 'fallback' ? 0 : '100%',
                    display: 'block',
                    outline: 'none',
                    minHeight: renderMode === 'fallback' ? 0 : '100dvh',
                    opacity: renderMode === 'babylon' ? 1 : 0,
                    transition: 'opacity 220ms ease',
                }}
            />
        </div>
    );
}
