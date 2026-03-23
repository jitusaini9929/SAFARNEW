"use client"

import confetti from "canvas-confetti"

export function triggerFireworks() {
  const duration = 5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 21, spread: 360, ticks: 60, zIndex: 100000 }

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  }, 250)
}

export function triggerSideCannons() {
  const end = Date.now() + 3 * 1000 // 3 seconds
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]

  const frame = () => {
    if (Date.now() > end) return

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 42,
      origin: { x: 0, y: 0.5 },
      colors: colors,
      zIndex: 100000
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 42,
      origin: { x: 1, y: 0.5 },
      colors: colors,
      zIndex: 100000
    })

    requestAnimationFrame(frame)
  }

  frame()
}
