import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  text?: string
  showBackground?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LoaderCircle = () => (
  <div className="relative w-24 h-24 mx-auto mb-6">
    <div className="absolute inset-0 rounded-full border-6 border-blue-200/35" />
    <div className="absolute inset-0 rounded-full border-6 border-transparent border-t-[#2C82FF] border-r-[#4AA3FF] animate-spin" />
    <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
      <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center">
        <span className="text-white text-[0.65rem]">✓</span>
      </div>
    </div>
  </div>
)

const LoadingText = ({ text }: { text?: string }) => (
  <div className="space-y-1 text-center">
    <p className="mv-heading text-2xl">{text || "Loading..."}</p>
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Please wait while we prepare your content</p>
  </div>
)

const LoadingDots = () => (
  <div className="flex justify-center gap-2 mt-4">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="h-3 w-3 animate-bounce border border-black/10 bg-[#f3f7ff]"
        style={{ animationDelay: `${dot * 150}ms` }}
      />
    ))}
  </div>
)

const ProgressBar = () => (
  <div className="mx-auto my-4 h-1.5 w-64 overflow-hidden border border-black/10 bg-white/70">
    <div className="h-full animate-pulse bg-[linear-gradient(90deg,#95b9ff_0%,#1f4ea3_100%)]" />
  </div>
)

export function LoadingOverlay({
  text = "Loading...",
  showBackground = true,
  size = 'md',
  className,
}: LoadingOverlayProps) {
  const sizeClasses = {
    sm: 'min-h-[160px]',
    md: 'min-h-[220px]',
    lg: 'min-h-[280px]',
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 text-center",
        sizeClasses[size],
        showBackground ? "mv-panel" : "",
        className
      )}
    >
      {/* <LoaderCircle /> */}
      <LoadingText text={text} />
      <ProgressBar />
      <LoadingDots />
    </div>
  )
}

export function FullPageLoading({ 
  text = "Loading...",
  showHeader = true 
}: { 
  text?: string
  showHeader?: boolean 
}) {
  return (
    <div className="mv-shell">
      {showHeader && <div className="h-16 border-b border-black/10 bg-white/80" />}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="mv-panel px-6 py-10">
          {/* <LoaderCircle /> */}
          <LoadingText text={text} />
          <ProgressBar />
          <LoadingDots />
        </div>
      </div>
    </div>
  )
}

export function PageTransitionLoading({ 
  text = "Loading Page...",
  showProgress = true 
}: { 
  text?: string
  showProgress?: boolean 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="mv-panel px-6 py-10">
        {/* <LoaderCircle /> */}
        <LoadingText text={text} />
        {showProgress && <ProgressBar />}
        <LoadingDots />
      </div>
    </div>
  )
}
