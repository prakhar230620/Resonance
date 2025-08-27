"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return

      currentY.current = e.touches[0].clientY
      const distance = Math.max(0, currentY.current - startY.current)

      if (distance > 0) {
        e.preventDefault()

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current)
        }

        updateTimeoutRef.current = setTimeout(() => {
          setPullDistance(Math.min(distance * 0.5, 80))
        }, 16) // ~60fps
      }
    },
    [isPulling],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    setIsPulling(false)

    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh])

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-transform duration-200 ease-out will-change-transform"
        style={{
          height: `${pullDistance}px`,
          transform: `translate3d(0, ${-Math.max(0, 80 - pullDistance)}px, 0)`,
        }}
      >
        <RefreshCw
          className={cn(
            "w-6 h-6 text-muted-foreground transition-all duration-200",
            isRefreshing && "animate-spin",
            pullDistance > 60 && "text-primary scale-110",
          )}
        />
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `translate3d(0, ${pullDistance}px, 0)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
