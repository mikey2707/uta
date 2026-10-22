import React from "react"
import { cn } from "@/lib/utils"

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40 dark:opacity-30",
        className
      )}
    >
      <div className="absolute -top-[40%] left-[20%] h-[1000px] w-[1000px] rounded-full bg-gradient-to-tr from-red-600/20 via-rose-500/20 to-orange-400/10 blur-[130px]" />
      <div className="absolute top-[60%] -left-[20%] h-[800px] w-[800px] rounded-full bg-gradient-to-br from-rose-600/15 via-red-500/15 to-amber-500/10 blur-[120px]" />
      <div className="absolute top-[30%] -right-[20%] h-[700px] w-[700px] rounded-full bg-gradient-to-bl from-red-500/20 via-crimson/15 to-orange-300/10 blur-[140px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
      />
    </div>
  )
}
