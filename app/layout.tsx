import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { PWAProvider } from "@/components/pwa-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/toaster"
import { AutoRescan } from "@/components/auto-rescan"
import { BackArrow } from "@/components/back-arrow"
import { SettingsApplier } from "@/components/settings-applier"

export const metadata: Metadata = {
  title: "Resonance - Music Player",
  description: "A modern, offline-first PWA music player for your local audio files",
  generator: "v0.app",
  applicationName: "Resonance Music Player",
  keywords: ["music", "player", "PWA", "offline", "audio", "mobile"],
  authors: [{ name: "Resonance Team" }],
  creator: "Resonance Team",
  publisher: "Resonance Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Resonance",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f2937" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} safe-area-inset`}>
        <ErrorBoundary>
          <PWAProvider>
            {/* Apply persisted theme/accent/compact settings */}
            <SettingsApplier />
            <BackArrow />
            {children}
            {/* Auto-rescan saved music folders on startup */}
            <AutoRescan />
            <Toaster />
          </PWAProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
