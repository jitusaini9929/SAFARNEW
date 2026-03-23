import React from "react"
import confetti from "canvas-confetti"
import { motion, HTMLMotionProps } from "framer-motion"

export const triggerFireworks = () => {
  const duration = 5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 21, spread: 360, ticks: 60, zIndex: 0 }

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

export const triggerSideCannons = () => {
  const end = Date.now() + 3 * 1000 // 3 seconds
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#3b82f6", "#14b8a6"]

  const frame = () => {
    if (Date.now() > end) return

    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      startVelocity: 42,
      origin: { x: 0, y: 0.7 },
      colors: colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      startVelocity: 42,
      origin: { x: 1, y: 0.7 },
      colors: colors,
    })

    requestAnimationFrame(frame)
  }

  frame()
}

export function ConfettiFireworks({ className, children = "Trigger Fireworks", ...props }: HTMLMotionProps<"button"> & { className?: string, children?: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) props.onClick(e)
    triggerFireworks()
  }

  return (
    <motion.button onClick={handleClick} className={className} {...props}>
      {children}
    </motion.button>
  )
}

export function ConfettiSideCannons({ className, children = "Trigger Side Cannons", ...props }: HTMLMotionProps<"button"> & { className?: string, children?: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) props.onClick(e)
    triggerSideCannons()
  }

  return (
    <motion.button onClick={handleClick} className={className} {...props}>
      {children}
    </motion.button>
  )
}
