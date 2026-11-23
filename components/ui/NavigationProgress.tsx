"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Loader2, Coffee } from "lucide-react"

function NavigationProgressBarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  // Reset when path or search changes (navigation finished)
  React.useEffect(() => {
    setIsLoading(false)
    setProgress(100)
    const timer = setTimeout(() => {
      setProgress(0)
    }, 250)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  // Progress animation while loading
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading) {
      setProgress(20)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev
          const step = Math.max(1, (85 - prev) * 0.2)
          return Math.min(85, prev + step)
        })
      }, 150)
    }
    return () => clearInterval(interval)
  }, [isLoading])

  // Intercept internal link clicks to trigger instant visual feedback
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a")
      if (!target) return

      const href = target.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return
      if (target.getAttribute("target") === "_blank") return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      try {
        const targetUrl = new URL(target.href, window.location.origin)
        const currentUrl = new URL(window.location.href)

        // Only trigger for same-origin transitions to different paths
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname ||
            targetUrl.search !== currentUrl.search)
        ) {
          setIsLoading(true)
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    document.addEventListener("click", handleClick, { capture: true })
    return () => document.removeEventListener("click", handleClick, { capture: true })
  }, [])

  if (!isLoading && progress === 0) return null

  return (
    <>
      {/* ── Top Fixed Progress Bar ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-[#E8DED0]/50 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#B56C4A] via-[#737B52] to-[#43291F] transition-all duration-200 ease-out shadow-[0_0_8px_rgba(181,108,74,0.6)]"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
            transition: progress === 100 ? "width 150ms ease-out, opacity 250ms ease-out" : "width 200ms ease-out",
          }}
        />
      </div>

      {/* ── Floating Subtle Spinner Pill (Top-Right) ── */}
      {isLoading && (
        <div
          className="fixed top-3 right-4 z-[9999] bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E8DED0] px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold text-[#43291F] animate-in fade-in slide-in-from-top-2 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B56C4A]" />
          <span>Loading...</span>
        </div>
      )}
    </>
  )
}

export function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <NavigationProgressBarInner />
    </React.Suspense>
  )
}
