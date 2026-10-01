'use client'

import { useSyncExternalStore } from 'react'

let now = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => now || (now = Date.now()),
    () => 0,
  )
}

const TIDE_PERIOD_MS = 12.42 * 60 * 60 * 1000

export function getTide(timestamp: number) {
  const phase = (timestamp % TIDE_PERIOD_MS) / TIDE_PERIOD_MS
  const rising = phase < 0.5
  const msToTurn = ((rising ? 0.5 : 1) - phase) * TIDE_PERIOD_MS
  return { rising, turnAt: new Date(timestamp + msToTurn) }
}
