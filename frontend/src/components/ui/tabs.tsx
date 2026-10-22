import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type TabItem = {
  title: string
  value: string
  icon?: React.ReactNode
  badge?: string
  content?: React.ReactNode
}

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  active,
  onChange,
}: {
  tabs: TabItem[]
  containerClassName?: string
  activeTabClassName?: string
  tabClassName?: string
  contentClassName?: string
  active?: TabItem
  onChange?: (tab: TabItem) => void
}) => {
  const [internalActive, setInternalActive] = useState<TabItem>(propTabs[0])
  const activeTab = active !== undefined ? active : internalActive

  const handleSelect = (tab: TabItem) => {
    setInternalActive(tab)
    onChange?.(tab)
  }

  return (
    <div className="flex flex-col w-full">
      <div
        className={cn(
          "flex flex-row items-center justify-center [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full gap-2 p-1.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 shadow-inner",
          containerClassName
        )}
      >
        {propTabs.map((tab) => {
          const isActive = activeTab.value === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => handleSelect(tab)}
              className={cn(
                "relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 outline-none select-none",
                isActive
                  ? "text-zinc-900 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
                tabClassName
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="active-tab-indicator"
                  className={cn(
                    "absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-zinc-200/80 dark:border-zinc-700/60",
                    activeTabClassName
                  )}
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span>{tab.title}</span>
                {tab.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className={cn("mt-6 w-full", contentClassName)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.value}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeTab.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
