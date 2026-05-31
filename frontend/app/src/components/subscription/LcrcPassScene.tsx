import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

interface Props {
    progressRatio: number   // 0–1
    isCompleted: boolean
    onCompleted?: () => void
}

// Path definition mirrors the POC's coastal running path
const PATH_D = 'M0,350 C150,350 200,250 300,250 S500,350 600,250 S750,150 800,150'

export function LcrcPassScene({ progressRatio, isCompleted, onCompleted }: Props) {
    // Animation refs
    const runnerRef      = useRef<SVGGElement>(null)
    const runnerRigRef   = useRef<SVGGElement>(null)
    const legLRef        = useRef<SVGGElement>(null)
    const legRRef        = useRef<SVGGElement>(null)
    const armLRef        = useRef<SVGGElement>(null)
    const armRRef        = useRef<SVGGElement>(null)
    const sweatRef       = useRef<SVGPathElement>(null)
    const faceRunRef     = useRef<SVGGElement>(null)
    const faceRestRef    = useRef<SVGGElement>(null)
    const flagBgRef      = useRef<SVGRectElement>(null)
    const flagCheckRef   = useRef<SVGGElement>(null)
    const flagPoleRef    = useRef<SVGRectElement>(null)
    const dustRef        = useRef<SVGGElement>(null)
    const bgBirdsRef     = useRef<SVGGElement>(null)
    const milestoneRef   = useRef<SVGGElement>(null)
    const pathRef        = useRef<SVGPathElement>(null)

    const timelinesRef = useRef<{
        run?: gsap.core.Timeline
        sweat?: gsap.core.Tween
        bg?: gsap.core.Tween
        flag?: gsap.core.Timeline
        path?: gsap.core.Timeline
        dustId?: ReturnType<typeof setInterval>
    }>({})

    // ── Running loop ──────────────────────────────────────────────────────────
    useEffect(() => {
        const tl = timelinesRef.current
        const { current: legL } = legLRef
        const { current: legR } = legRRef
        const { current: armL } = armLRef
        const { current: armR } = armRRef
        const { current: rig }  = runnerRigRef
        const { current: sweat } = sweatRef
        const { current: bgBirds } = bgBirdsRef

        if (!legL || !legR || !armL || !armR || !rig || !sweat || !bgBirds) return

        if (isCompleted) {
            // Activate flag
            if (flagPoleRef.current) gsap.to(flagPoleRef.current,  { fill: '#e63946', duration: 0.5 })
            if (flagCheckRef.current) gsap.to(flagCheckRef.current, { fill: '#000', duration: 0.5, delay: 0.1 })
            if (flagBgRef.current)   gsap.to(flagBgRef.current,    { fill: '#fff', duration: 0.5, delay: 0.1 })
            if (tl.flag) tl.flag.timeScale(2)

            // Milestone pop
            if (milestoneRef.current) {
                gsap.fromTo(milestoneRef.current, { scale: 1 }, { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.out' })
            }

            // Trigger modal after brief delay
            if (onCompleted) setTimeout(onCompleted, 1200)
        }

        // Running loop (always runs)
        if (tl.run) tl.run.kill()
        const runTl = gsap.timeline({ repeat: -1, yoyo: true })
        runTl.to(legL, { rotation: 45,  duration: 0.3, ease: 'sine.inOut', transformOrigin: '50% 0%' }, 0)
             .to(legR, { rotation: -45, duration: 0.3, ease: 'sine.inOut', transformOrigin: '50% 0%' }, 0)
             .to(armL, { rotation: -40, duration: 0.3, ease: 'sine.inOut', transformOrigin: '100% 0%' }, 0)
             .to(armR, { rotation: 40,  duration: 0.3, ease: 'sine.inOut', transformOrigin: '0% 0%' }, 0)
        tl.run = runTl

        gsap.to(rig, { y: -5, rotation: 2, duration: 0.15, repeat: -1, yoyo: true, ease: 'sine.inOut' })

        // Sweat drop (only if not completed)
        if (tl.sweat) tl.sweat.kill()
        if (!isCompleted) {
            tl.sweat = gsap.to(sweat, { opacity: 1, y: 10, duration: 0.8, repeat: -1, ease: 'power1.in' })
        } else {
            gsap.set(sweat, { opacity: 0 })
        }

        // Birds
        if (tl.bg) tl.bg.kill()
        tl.bg = gsap.to(bgBirds.querySelectorAll('path'), {
            y: -15, x: 5, rotation: 2, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.5
        })

        // Dust particles
        if (tl.dustId) clearInterval(tl.dustId)
        tl.dustId = setInterval(() => spawnDust(dustRef.current), 150)

        // Flag subtle wave when running
        if (tl.flag) tl.flag.kill()
        const flagTl = gsap.timeline({ repeat: -1, yoyo: true })
        if (flagBgRef.current && flagCheckRef.current) {
            flagTl.to([flagBgRef.current, flagCheckRef.current], {
                scaleX: 0.95, skewY: 5, duration: 0.5, ease: 'sine.inOut', transformOrigin: '0% 50%'
            })
        }
        tl.flag = flagTl

        // Set faces
        if (isCompleted) {
            if (faceRunRef.current) gsap.set(faceRunRef.current, { display: 'none' })
            if (faceRestRef.current) gsap.set(faceRestRef.current, { display: 'block' })
        } else {
            if (faceRunRef.current) gsap.set(faceRunRef.current, { display: 'block' })
            if (faceRestRef.current) gsap.set(faceRestRef.current, { display: 'none' })
        }

        return () => {
            runTl.kill()
            tl.sweat?.kill()
            tl.bg?.kill()
            tl.flag?.kill()
            if (tl.dustId) clearInterval(tl.dustId)
            gsap.killTweensOf(rig)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCompleted])

    // ── Runner position on path ───────────────────────────────────────────────
    useEffect(() => {
        const runner  = runnerRef.current
        const path    = pathRef.current
        const tl      = timelinesRef.current

        if (!runner || !path) return

        if (!tl.path) {
            tl.path = gsap.timeline({ paused: true })
            tl.path.to(runner, {
                duration: 1,
                ease: 'none',
                motionPath: {
                    path: path,
                    align: path,
                    alignOrigin: [0.5, 1],
                    start: 0.05,
                    end: 0.95,
                },
            })
        }

        gsap.to(tl.path, { progress: progressRatio, duration: 1.5, ease: 'power2.out' })
    }, [progressRatio])

    return (
        <div className="w-full overflow-hidden rounded-t-none">
            <svg
                viewBox="0 0 800 400"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
                aria-hidden="true"
            >
                <defs>
                    {/* Dark sky gradient */}
                    <linearGradient id="lcrc-sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#0d0d0d" />
                        <stop offset="100%" stopColor="#1a1a1a" />
                    </linearGradient>
                    {/* Water shimmer */}
                    <linearGradient id="lcrc-water" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#e63946" stopOpacity="0.15" />
                        <stop offset="50%"  stopColor="#f4a261" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#e63946" stopOpacity="0.15" />
                    </linearGradient>
                </defs>

                {/* Background */}
                <rect width="800" height="400" fill="url(#lcrc-sky)" />

                {/* Coastal landscape */}
                {/* Moon */}
                <circle cx="700" cy="70" r="30" fill="#f4a261" opacity="0.12" />
                <circle cx="700" cy="70" r="22" fill="#f4a261" opacity="0.18" />

                {/* Stars */}
                {[[120,40],[250,25],[480,55],[580,30],[350,15]].map(([x,y],i)=>(
                    <circle key={i} cx={x} cy={y} r="1.5" fill="white" opacity="0.5" />
                ))}

                {/* Coast hills silhouette */}
                <path d="M0,320 Q100,280 200,300 Q300,320 400,290 Q500,260 600,280 Q700,300 800,270 L800,400 L0,400 Z"
                      fill="#111" opacity="0.8" />

                {/* Water at bottom */}
                <path d="M0,370 Q100,360 200,370 T400,370 T600,370 T800,370 L800,400 L0,400 Z"
                      fill="url(#lcrc-water)" />
                {/* Wave lines */}
                <path d="M0,380 Q40,374 80,380 T160,380 T240,380 T320,380 T400,380 T480,380 T560,380 T640,380 T720,380 T800,380"
                      fill="none" stroke="#e63946" strokeWidth="1.5" opacity="0.25" />

                {/* Birds/seagulls */}
                <g ref={bgBirdsRef}>
                    <path d="M100,110 Q113,100 126,110 Q139,100 152,110" fill="none" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                    <path d="M650,60  Q659,52  668,60  Q677,52  686,60"  fill="none" stroke="#f4a261" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                    <path d="M380,35  Q386,30  392,35  Q398,30  404,35"  fill="none" stroke="#e63946" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </g>

                {/* The running path */}
                <path
                    ref={pathRef}
                    id="lcrc-terrain-path"
                    d={PATH_D}
                    fill="none"
                    stroke="#e63946"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.55"
                />

                {/* Finish flag */}
                <g ref={milestoneRef} transform="translate(750, 110)">
                    <rect ref={flagPoleRef} x="-4" y="0" width="8" height="55" fill="#2a2a2a" rx="2" />
                    {/* Flag */}
                    <rect ref={flagBgRef} x="-4" y="0" width="46" height="28" fill="#2a2a2a" stroke="#444" strokeWidth="1.5" rx="1" />
                    <g ref={flagCheckRef} fill="#3a3a3a">
                        <rect x="-4" y="0"  width="9" height="9" />
                        <rect x="14" y="0"  width="9" height="9" />
                        <rect x="32" y="0"  width="9" height="9" />
                        <rect x="5"  y="9"  width="9" height="9" />
                        <rect x="23" y="9"  width="9" height="9" />
                        <rect x="-4" y="18" width="9" height="10" />
                        <rect x="14" y="18" width="9" height="10" />
                        <rect x="32" y="18" width="9" height="10" />
                    </g>
                </g>

                {/* Runner character */}
                <g ref={runnerRef} transform="translate(50,300)">
                    {/* Dust particles container */}
                    <g ref={dustRef} />

                    <g ref={runnerRigRef}>
                        {/* Back arm */}
                        <g ref={armLRef} transform="translate(-10,-10)">
                            <line x1="0" y1="0" x2="-10" y2="20" stroke="#f4a261" strokeWidth="5" strokeLinecap="round" />
                            <circle cx="-10" cy="20" r="5" fill="#2a2a2a" stroke="#f4a261" strokeWidth="2" />
                        </g>

                        {/* Back leg */}
                        <g ref={legLRef} transform="translate(-5,20)">
                            <line x1="0" y1="0" x2="0" y2="24" stroke="#e63946" strokeWidth="6" strokeLinecap="round" />
                            <path d="M-5,24 L5,24 L8,31 L-5,31 Z" fill="#2a2a2a" stroke="#e63946" strokeWidth="2" />
                        </g>

                        {/* Torso (lightning bolt shape) */}
                        <path d="M-14,-38 L14,-38 L18,-10 L32,-10 L-4,38 L1,10 L-18,10 Z"
                              fill="#1a1a1a" stroke="#e63946" strokeWidth="3" strokeLinejoin="round" />

                        {/* Front leg */}
                        <g ref={legRRef} transform="translate(5,20)">
                            <line x1="0" y1="0" x2="0" y2="24" stroke="#e63946" strokeWidth="6" strokeLinecap="round" />
                            <path d="M-5,24 L5,24 L8,31 L-5,31 Z" fill="#2a2a2a" stroke="#e63946" strokeWidth="2" />
                        </g>

                        {/* Front arm */}
                        <g ref={armRRef} transform="translate(10,-10)">
                            <line x1="0" y1="0" x2="10" y2="20" stroke="#f4a261" strokeWidth="5" strokeLinecap="round" />
                            <circle cx="10" cy="20" r="5" fill="#2a2a2a" stroke="#f4a261" strokeWidth="2" />
                        </g>

                        {/* Face running */}
                        <g ref={faceRunRef} transform="translate(0,-14)">
                            <ellipse cx="-6" cy="-5" rx="2" ry="3" fill="#e63946" />
                            <ellipse cx="6"  cy="-5" rx="2" ry="3" fill="#e63946" />
                            <path d="M-6,5 Q0,9 6,5" fill="none" stroke="#e63946" strokeWidth="2" />
                            {/* Sweat drop */}
                            <path ref={sweatRef} d="M18,-10 Q21,-15 18,-20" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0" />
                        </g>

                        {/* Face resting (post-finish) */}
                        <g ref={faceRestRef} transform="translate(0,-14)" style={{ display: 'none' }}>
                            <path d="M-8,-5 Q-6,-8 -4,-5" fill="none" stroke="#e63946" strokeWidth="2" />
                            <path d="M4,-5 Q6,-8 8,-5"   fill="none" stroke="#e63946" strokeWidth="2" />
                            <path d="M-6,5 Q0,10 6,5"    fill="none" stroke="#e63946" strokeWidth="2" />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function spawnDust(container: SVGGElement | null) {
    if (!container) return
    const ns   = 'http://www.w3.org/2000/svg'
    const dust = document.createElementNS(ns, 'circle')
    dust.setAttribute('cx', '0')
    dust.setAttribute('cy', '60')
    dust.setAttribute('r',  String(Math.random() * 4 + 3))
    dust.setAttribute('fill', '#666')
    dust.setAttribute('opacity', '0.7')
    container.appendChild(dust)

    gsap.to(dust, {
        x: -55 - Math.random() * 25,
        y: -15 - Math.random() * 15,
        scale: 0,
        opacity: 0,
        duration: 1.8,
        ease: 'power1.out',
        onComplete: () => { if (dust.parentNode) dust.parentNode.removeChild(dust) },
    })
}
