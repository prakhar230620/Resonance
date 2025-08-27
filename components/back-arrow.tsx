"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackArrow() {
  const router = useRouter()
  const pathname = usePathname()

  const onBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }, [router])

  // Hide on home route
  if (pathname === "/") return null

  return (
    // Sticky so it participates in layout and does not overlap content
    <div
      role="navigation"
      className="sticky top-0 z-30 select-none px-6 pt-3 mb-4"
      style={{ top: "calc(env(safe-area-inset-top) + 4px)" }}
    >
      <button
        type="button"
        aria-label="Go back"
        onClick={onBack}
        className="p-2 rounded-full text-foreground/90 hover:text-foreground transition-colors focus:outline-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
    </div>
  )
}
