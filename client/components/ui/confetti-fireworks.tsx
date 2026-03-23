import React from "react"
import confetti from "canvas-confetti"
import { Button } from "@/components/ui/button"

export function ConfettiFireworks() {
  const handleClick = () => {
    const duration = 5 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

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

  return (
    <div className="relative">
      <Button 
        onClick={handleClick}
        className="bg-transparent border border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 font-bold uppercase tracking-widest text-xs px-4 py-1.5 rounded-full shadow-lg transition-all flex items-center gap-2"
        variant="outline"
      >
        <span className="text-xl">🎇</span> Firecracker
      </Button>
    </div>
  )
}
