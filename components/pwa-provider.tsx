"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, RefreshCw, X, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setRegistration(reg)

          // Check for updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setShowUpdatePrompt(true)
                }
              })
            }
          })
        })
        .catch((error) => console.log("SW registration failed:", error))
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show install prompt after 30 seconds if not already installed
      setTimeout(() => {
        if (!window.matchMedia("(display-mode: standalone)").matches) {
          setShowInstallPrompt(true)
        }
      }, 30000)
    }

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial online status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" })
      window.location.reload()
    }
  }

  return (
    <>
      {children}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300">
          <Card className="p-3 bg-orange-500/90 text-white border-orange-600">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">You're offline</span>
            </div>
          </Card>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <Card className="p-4 bg-card/95 backdrop-blur-sm border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Install Resonance</h3>
                <p className="text-xs text-muted-foreground mb-3">Add to your home screen for the best experience</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstall} className="text-xs">
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowInstallPrompt(false)} className="text-xs">
                    Not now
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowInstallPrompt(false)} className="w-6 h-6">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <Card className="p-4 bg-card/95 backdrop-blur-sm border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Update Available</h3>
                <p className="text-xs text-muted-foreground mb-3">A new version of Resonance is ready to install</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdate} className="text-xs">
                    Update Now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowUpdatePrompt(false)} className="text-xs">
                    Later
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowUpdatePrompt(false)} className="w-6 h-6">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-40">
        <div
          className={cn("w-3 h-3 rounded-full transition-all duration-300", isOnline ? "bg-green-500" : "bg-red-500")}
        />
      </div>
    </>
  )
}
