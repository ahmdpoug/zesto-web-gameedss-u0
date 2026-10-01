'use client'

import { useEffect, useRef } from 'react'
import { input } from '@/lib/zesto/world'
import { cn } from '@/lib/utils'

const RADIUS = 44
const DEADZONE = 0.12

export function Joystick({ disabled }: { disabled?: boolean }) {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const center = useRef({ x: 0, y: 0 })

  const reset = () => {
    pointer.current = null
    input.x = 0
    input.y = 0
    if (knob.current) knob.current.style.transform = 'translate(-50%, -50%)'
    base.current?.removeAttribute('data-active')
  }

  const update = (clientX: number, clientY: number) => {
    const dx = clientX - center.current.x
    const dy = clientY - center.current.y
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, RADIUS)
    const nx = dist ? (dx / dist) * clamped : 0
    const ny = dist ? (dy / dist) * clamped : 0
    if (knob.current) knob.current.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`
    const mag = clamped / RADIUS
    const scaled = mag < DEADZONE ? 0 : (mag - DEADZONE) / (1 - DEADZONE)
    input.x = dist ? (dx / dist) * scaled : 0
    input.y = dist ? (-dy / dist) * scaled : 0
  }

  useEffect(() => {
    if (disabled) reset()
  }, [disabled])

  useEffect(() => reset, [])

  return (
    <div
      ref={base}
      role="application"
      aria-label="Movement joystick. On a keyboard, use W A S D or the arrow keys."
      className={cn(
        'group relative size-32 shrink-0 touch-none select-none rounded-full transition-opacity sm:size-36',
        disabled && 'pointer-events-none opacity-40',
      )}
      onPointerDown={(e) => {
        if (pointer.current !== null) return
        const rect = e.currentTarget.getBoundingClientRect()
        center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        pointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        e.currentTarget.setAttribute('data-active', '')
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointer.current) update(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => e.pointerId === pointer.current && reset()}
      onPointerCancel={(e) => e.pointerId === pointer.current && reset()}
      onLostPointerCapture={(e) => e.pointerId === pointer.current && reset()}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-white/15 bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.16),rgb(10_16_30/0.55)_70%)] shadow-[0_12px_40px_-12px_rgb(0_0_0/0.7),inset_0_1px_0_rgb(255_255_255/0.15)] backdrop-blur-md transition group-data-[active]:border-primary/50"
      />
      <div aria-hidden="true" className="absolute inset-3 rounded-full border border-dashed border-white/10" />
      {[0, 90, 180, 270].map((deg) => (
        <span
          key={deg}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 size-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-white/40"
          style={{ transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-52px)` }}
        />
      ))}
      <div
        ref={knob}
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-14 rounded-full bg-gradient-to-b from-[#ffd08a] to-[#ff8a2a] shadow-[0_8px_20px_-4px_#ff8a2a,inset_0_2px_0_rgb(255_255_255/0.55),inset_0_-3px_6px_rgb(120_40_0/0.35)] transition-transform duration-75 sm:size-16"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </div>
  )
}
