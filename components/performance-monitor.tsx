"use client"

import { useEffect } from "react"

export function PerformanceMonitor() {
  useEffect(() => {
    // Web Vitals monitoring
    if (typeof window !== "undefined") {
      // Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.log(`[Performance] ${entry.name}:`, entry)

          // You can send this data to your analytics service
          if (entry.entryType === "measure") {
            // Custom performance marks
          } else if (entry.entryType === "navigation") {
            // Navigation timing
          }
        })
      })

      observer.observe({ entryTypes: ["measure", "navigation"] })

      // Memory usage monitoring
      if ("memory" in performance) {
        const memoryInfo = (performance as any).memory
        console.log("[Performance] Memory usage:", {
          used: Math.round(memoryInfo.usedJSHeapSize / 1048576) + " MB",
          total: Math.round(memoryInfo.totalJSHeapSize / 1048576) + " MB",
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1048576) + " MB",
        })
      }

      // Battery API monitoring
      if ("getBattery" in navigator) {
        ;(navigator as any).getBattery().then((battery: any) => {
          console.log("[Performance] Battery level:", Math.round(battery.level * 100) + "%")
          console.log("[Performance] Battery charging:", battery.charging)
        })
      }

      return () => observer.disconnect()
    }
  }, [])

  return null
}
