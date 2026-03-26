import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface UserReward {
    milestone_months: number
    unlocked: boolean
    claimed: boolean
}

interface Props {
    progressRatio: number
    rewards?: UserReward[]
}

const MILESTONES = [3, 6, 12]

export function VerticalTimeline({ progressRatio, rewards }: Props) {
    const progressLineRef = useRef<SVGLineElement>(null)
    const nodeRefs = useRef<(SVGGElement | null)[]>([])

    // Set height based on 0-1 ratio mapped to SVG coordinates (20 to 380)
    // 0mo = y:20, 12mo = y:380 (range 360)
    useEffect(() => {
        if (!progressLineRef.current) return
        
        const progressY = 20 + (progressRatio * 360)
        
        gsap.to(progressLineRef.current, {
            attr: { y2: progressY },
            duration: 1.5,
            ease: 'power2.out',
            delay: 0.2 // slight delay to let scene build
        })
    }, [progressRatio])

    // Pop animation for nodes when they are unlocked
    useEffect(() => {
        nodeRefs.current.forEach((node, idx) => {
            if (!node) return
            
            const milestone = MILESTONES[idx]
            const isUnlocked = rewards?.find(r => r.milestone_months === milestone)?.unlocked
            
            if (isUnlocked && !node.classList.contains('active')) {
                node.classList.add('active')
                
                // Change styles to active state
                const outerCircle = node.querySelector('.outer')
                const innerCircle = node.querySelector('.inner')
                const iconPath = node.querySelector('.icon')
                
                if (outerCircle) gsap.to(outerCircle, { stroke: '#f4a261', fill: '#f4a261', fillOpacity: 0.1, duration: 0.4 })
                if (innerCircle) gsap.to(innerCircle, { fill: '#f4a261', opacity: 1, duration: 0.4 })
                if (iconPath) gsap.to(iconPath, { stroke: '#1a1a1a', fill: '#f4a261', duration: 0.4 })
                
                // Pop animation
                gsap.fromTo(node, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' })
            }
        })
    }, [rewards])

    return (
        <div className="relative flex min-h-[400px]">
            {/* SVG Timeline */}
            <div className="w-20 shrink-0 relative">
                <svg viewBox="0 0 60 400" className="absolute inset-0 w-full h-full overflow-visible">
                    {/* Background Line */}
                    <line x1="30" y1="20" x2="30" y2="380" stroke="#2a2a2a" strokeWidth="4" strokeLinecap="round" />
                    
                    {/* Active Progress Line */}
                    <line 
                        ref={progressLineRef}
                        x1="30" y1="20" x2="30" y2="20" 
                        stroke="#e63946" strokeWidth="4" strokeLinecap="round" 
                    />

                    {/* Node 1: 3 Months */}
                    <g ref={el => { nodeRefs.current[0] = el }} transform="translate(30, 110)" style={{ transformOrigin: '30px 110px' }}>
                        <circle className="outer" cx="0" cy="0" r="10" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="3" />
                        <circle className="inner" cx="0" cy="0" r="5" fill="#2a2a2a" opacity="1" />
                    </g>

                    {/* Node 2: 6 Months */}
                    <g ref={el => { nodeRefs.current[1] = el }} transform="translate(30, 200)" style={{ transformOrigin: '30px 200px' }}>
                        <circle className="outer" cx="0" cy="0" r="10" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="3" />
                        <circle className="inner" cx="0" cy="0" r="5" fill="#2a2a2a" opacity="1" />
                    </g>

                    {/* Node 3: 12 Months (Final trophy) */}
                    <g ref={el => { nodeRefs.current[2] = el }} transform="translate(30, 380)" style={{ transformOrigin: '30px 380px' }}>
                        <circle className="outer" cx="0" cy="0" r="14" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="3" />
                        <path className="icon" 
                            d="M-5,-4 L-5,1 Q-5,5 0,5 Q5,5 5,1 L5,-4 Z M-3,5 L-3,8 L3,8 L3,5 M-5,8 L5,8 M-5,-2 C-8,-2 -8,2 -5,2 M5,-2 C8,-2 8,2 5,2" 
                            fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" 
                        />
                    </g>
                </svg>
            </div>

            {/* Labels beside SVG */}
            <div className="flex-1 relative text-sm font-medium">
                <div className="absolute flex flex-col justify-center" style={{ top: '98px', height: '24px' }}>
                    <span className="text-[var(--t-fg)]">3 Meses</span>
                    <span className="text-xs text-[var(--t-fg-dimmed)] font-normal">Camiseta exclusiva</span>
                </div>
                <div className="absolute flex flex-col justify-center" style={{ top: '188px', height: '24px' }}>
                    <span className="text-[var(--t-fg)]">6 Meses</span>
                    <span className="text-xs text-[var(--t-fg-dimmed)] font-normal">Gorra de corredor</span>
                </div>
                <div className="absolute flex flex-col justify-center" style={{ top: '365px', height: '24px' }}>
                    <span className="text-[var(--t-accent2)]">1 Año en LCRC</span>
                    <span className="text-xs text-[var(--t-accent2)]/70 font-normal">Medalla aniversario</span>
                </div>
            </div>
        </div>
    )
}
