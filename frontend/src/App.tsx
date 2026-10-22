import React from "react"
import { motion } from "framer-motion"
import {
  Scissors,
  FileImage,
  Video,
  Music,
  FileText,
  Sparkles,
  Server,
} from "lucide-react"
import BackgroundRemover from "./components/BackgroundRemover"
import ImageConverter from "./components/ImageConverter"
import VideoDownloader from "./components/VideoDownloader"
import AudioConverter from "./components/AudioConverter"
import PDFTools from "./components/PDFTools"
import ColorModeToggle from "./components/ColorModeToggle"
import { Tabs, TabItem } from "./components/ui/tabs"
import { BackgroundBeams } from "./components/ui/background-beams"

function App() {
  const tabs: TabItem[] = [
    {
      title: "Background Remover",
      value: "bg-remover",
      icon: <Scissors className="w-4 h-4 text-red-500" />,
      content: <BackgroundRemover />,
    },
    {
      title: "Image Converter",
      value: "image-converter",
      icon: <FileImage className="w-4 h-4 text-rose-500" />,
      content: <ImageConverter />,
    },
    {
      title: "Video Downloader",
      value: "video-downloader",
      icon: <Video className="w-4 h-4 text-red-600" />,
      badge: "Fixed",
      content: <VideoDownloader />,
    },
    {
      title: "Audio Converter",
      value: "audio-converter",
      icon: <Music className="w-4 h-4 text-orange-500" />,
      badge: "New",
      content: <AudioConverter />,
    },
    {
      title: "PDF Suite",
      value: "pdf-suite",
      icon: <FileText className="w-4 h-4 text-red-500" />,
      content: <PDFTools />,
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-red-500/30 selection:text-red-200">
      {/* Background Animated Beams */}
      <BackgroundBeams />

      {/* Floating Color Mode Toggle */}
      <ColorModeToggle />

      {/* Main Container */}
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col">
        {/* Header Hero */}
        <header className="text-center space-y-4 mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-red-500" />
            <span>UNIFIED TOOLS APP • v2.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 dark:from-red-400 dark:via-rose-400 dark:to-amber-400 bg-clip-text text-transparent"
          >
            Unified Tools
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto"
          >
            High-performance media conversion, background removal, and video downloading
            in a single unified container.
          </motion.p>
        </header>

        {/* Dynamic Tool Tabs */}
        <main className="flex-1 w-full">
          <Tabs tabs={tabs} />
        </main>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-200/60 dark:border-zinc-800/60 text-center text-xs text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-red-500" />
            <span>Container Hosted on Mikey Infrastructure</span>
          </div>
          <div>
            <span>Unified Tools • Aceternity UI & Componentry Powered</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App