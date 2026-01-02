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
  <div className="text-center space-y-1">
    <p className="text-xl font-black text-black">{text || "Loading..."}</p>
    <p className="text-xs text-black/40">Please wait while we prepare your content</p>
  </div>
)

const LoadingDots = () => (
  <div className="flex justify-center gap-2 mt-4">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="w-3 h-3 rounded-full bg-blue-300 animate-bounce"
        style={{ animationDelay: `${dot * 150}ms` }}
      />
    ))}
  </div>
)

const ProgressBar = () => (
  <div className="w-64 h-1.5 bg-blue-100/70 rounded-full mx-auto overflow-hidden my-4">
    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" />
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
        "flex flex-col items-center justify-center text-center p-6",
        sizeClasses[size],
        showBackground ? "bg-white" : "",
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
    <div className="min-h-screen bg-white text-black">
      {showHeader && <div className="h-16 bg-white/90 border-b border-black" />}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="px-6">
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
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="px-6">
        {/* <LoaderCircle /> */}
        <LoadingText text={text} />
        {showProgress && <ProgressBar />}
        <LoadingDots />
      </div>
    </div>
  )
}
