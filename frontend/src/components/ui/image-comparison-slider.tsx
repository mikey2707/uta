import React, { useState, useRef, useCallback } from "react"
import { Sparkles, MoveHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

export const ImageComparisonSlider = ({
  originalImage,
  processedImage,
  className,
  originalLabel = "Original",
  processedLabel = "Background Removed",
}: {
  originalImage: string
  processedImage: string
  className?: string
  originalLabel?: string
  processedLabel?: string
}) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPosition(percent)
    },
    []
  )

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    handleMove(e.touches[0].clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    handleMove(e.clientX)
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      className={cn(
        "relative w-full h-[380px] sm:h-[460px] overflow-hidden rounded-2xl select-none cursor-ew-resize border border-zinc-200 dark:border-zinc-800 shadow-xl",
        className
      )}
    >
      {/* Background (Processed image with checkerboard) */}
      <div className="absolute inset-0 w-full h-full bg-checkerboard flex items-center justify-center">
        <img
          src={processedImage}
          alt={processedLabel}
          className="w-full h-full object-contain pointer-events-none p-4"
        />
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          {processedLabel}
        </div>
      </div>

      {/* Foreground (Original image clipped by slider position) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={originalImage}
          alt={originalLabel}
          className="w-full h-full object-contain p-4"
        />
        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold shadow-md">
          {originalLabel}
        </div>
      </div>

      {/* Divider line and handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border-2 border-red-500 shadow-xl flex items-center justify-center text-zinc-800 dark:text-zinc-100">
          <MoveHorizontal className="w-4 h-4 text-red-500" />
        </div>
      </div>
    </div>
  )
}
