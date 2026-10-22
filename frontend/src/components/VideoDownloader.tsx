import React, { useState, useEffect, useRef } from "react"
import axios from "axios"
import confetti from "canvas-confetti"
import {
  Download,
  Search,
  Sparkles,
  Film,
  Music,
  AlertCircle,
  Clock,
  ClipboardPaste,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { cn, formatBytes, formatSeconds } from "@/lib/utils"
import { API_URL } from "../config"

interface VideoFormat {
  format_id: string
  resolution: string
  filesize_approx: number
  vcodec: string
  fps: number
  height?: number
  ext?: string
}

interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
  uploader?: string
  formats: VideoFormat[]
}

interface TaskProgress {
  task_id: string
  status: string
  phase?: string
  status_message?: string
  progress: number
  downloaded: number
  total: number
  speed: string
  eta: string
  is_downloading: boolean
  title: string
  error?: string
}

const VideoDownloader: React.FC = () => {
  const [url, setUrl] = useState("")
  const [selectedFormat, setSelectedFormat] = useState("")
  const [isAudioOnly, setIsAudioOnly] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [currentTask, setCurrentTask] = useState<TaskProgress | null>(null)
  const [downloadReadyPath, setDownloadReadyPath] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text.trim())
        triggerAnalysis(text.trim())
      }
    } catch (e) {
      console.warn("Clipboard access denied or unavailable", e)
    }
  }

  const triggerAnalysis = async (targetUrl = url) => {
    if (!targetUrl.trim()) return
    setIsAnalyzing(true)
    setErrorMessage(null)
    setVideoInfo(null)
    setDownloadReadyPath(null)
    setDownloadSuccessNotice(null)
    setSelectedFormat("")

    try {
      const formData = new FormData()
      formData.append("url", targetUrl.trim())

      const res = await axios.post(`${API_URL}/api/get-video-info`, formData)
      const data = res.data
      if (!data || !data.formats) {
        throw new Error("Invalid response received from server")
      }
      setVideoInfo(data)
      if (data.formats.length > 0) {
        setSelectedFormat(data.formats[0].format_id)
      }
    } catch (err: unknown) {
      console.error("Video analyze error:", err)
      let msg = "Could not analyze video. Verify the URL is valid."
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail
      }
      setErrorMessage(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const triggerFileSave = (filename: string, taskId?: string | null) => {
    try {
      const qParam = taskId ? `?task_id=${encodeURIComponent(taskId)}` : ""
      const downloadUrl = `${API_URL}/api/download/${encodeURIComponent(filename)}${qParam}`
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Save file error:", e)
    }
  }

  const startDownload = async () => {
    if (!url.trim()) return
    setIsDownloading(true)
    setErrorMessage(null)
    setDownloadReadyPath(null)
    setDownloadSuccessNotice(null)

    const taskId = Math.random().toString(36).substring(2, 12)
    setActiveTaskId(taskId)

    const selectedFmtObj = videoInfo?.formats.find((f) => f.format_id === selectedFormat)
    const resLabel = selectedFmtObj?.resolution || ""

    setCurrentTask({
      task_id: taskId,
      status: "starting",
      phase: isAudioOnly ? "Preparing audio download..." : `Preparing ${resLabel || "video"} download...`,
      status_message: isAudioOnly ? "Preparing audio download..." : `Preparing ${resLabel || "video"} download...`,
      progress: 0,
      downloaded: 0,
      total: selectedFmtObj?.filesize_approx || 0,
      speed: "0 B/s",
      eta: "Calculating...",
      is_downloading: true,
      title: videoInfo?.title || "",
    })

    // Ultra-responsive progress polling (every 400ms)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const progRes = await axios.get(`${API_URL}/api/download-progress/${taskId}`)
        if (progRes.data) {
          setCurrentTask(progRes.data)
          if (progRes.data.status === "finished") {
            clearInterval(pollRef.current!)
            pollRef.current = null
          }
        }
      } catch (e) {
        console.warn("Polling progress error:", e)
      }
    }, 400)

    try {
      const formData = new FormData()
      formData.append("url", url.trim())
      formData.append("task_id", taskId)
      formData.append("audio_only", isAudioOnly.toString())
      if (isAudioOnly) {
        formData.append("format", "mp3")
      } else if (selectedFormat) {
        formData.append("format_id", selectedFormat)
        formData.append("format", "mp4")
        formData.append("target_resolution", resLabel)
      }

      const res = await axios.post(`${API_URL}/api/download-video`, formData)
      if (res.data?.download_path) {
        const dlPath = res.data.download_path
        setDownloadReadyPath(dlPath)
        setDownloadSuccessNotice("Your download has started and will be automatically saved to your computer. Server storage has been cleaned.")
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        })

        // Automatically trigger browser download to the user's computer
        triggerFileSave(dlPath, taskId)
      }
    } catch (err: unknown) {
      console.error("Download error:", err)
      let msg = "Failed to download media. Please check server logs."
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        msg = err.response.data.detail
      }
      setErrorMessage(msg)
    } finally {
      setIsDownloading(false)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Input Header Card */}
      <Card className="border-red-500/20 shadow-2xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setErrorMessage(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") triggerAnalysis()
                }}
                placeholder="Paste video URL from YouTube, Vimeo, TikTok, etc..."
                className="w-full h-12 pl-12 pr-28 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-all"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from clipboard"
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste
              </button>
            </div>

            <Button
              onClick={() => triggerAnalysis()}
              disabled={!url.trim() || isAnalyzing}
              className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold gap-2 shrink-0"
              variant="gradient"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Video
                </>
              )}
            </Button>
          </div>

          {/* Toggle Audio-Only */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isAudioOnly
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}
              >
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Audio-Only Mode (MP3 320kbps)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Extract high quality audio without downloading video streams
                </p>
              </div>
            </div>
            <Switch
              checked={isAudioOnly}
              onCheckedChange={(checked) => setIsAudioOnly(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">Unable to process video</p>
            <p className="text-xs opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Success Notification Alert */}
      {downloadSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
          <Download className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">Download Initiated!</p>
            <p className="text-xs opacity-90">{downloadSuccessNotice}</p>
          </div>
        </div>
      )}

      {/* Video Details Card */}
      {videoInfo && (
        <Card className="overflow-hidden border-zinc-200/80 dark:border-zinc-800/80 shadow-xl">
          <div className="flex flex-col md:flex-row gap-6 p-6">
            {videoInfo.thumbnail && (
              <div className="relative w-full md:w-72 h-44 rounded-xl overflow-hidden bg-black shrink-0 shadow-md">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover"
                />
                {videoInfo.duration > 0 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatSeconds(videoInfo.duration)}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                  {videoInfo.title}
                </h3>
                {videoInfo.uploader && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    By {videoInfo.uploader}
                  </p>
                )}
              </div>

              {/* Format selection - SHOWS ALL AVAILABLE VIDEO QUALITIES */}
              {!isAudioOnly && videoInfo.formats?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Select Video Quality ({videoInfo.formats.length} Available)
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      Standard MP4 Container
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {videoInfo.formats.map((fmt) => {
                      const isSelected = selectedFormat === fmt.format_id
                      return (
                        <button
                          key={fmt.format_id}
                          type="button"
                          onClick={() => setSelectedFormat(fmt.format_id)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex flex-col items-start gap-1 text-left",
                            isSelected
                              ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-500/25 scale-[1.02]"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-red-400"
                          )}
                        >
                          <div className="flex items-center gap-1.5 w-full justify-between">
                            <span className="font-bold flex items-center gap-1">
                              <Film className="w-3 h-3" />
                              {fmt.resolution}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1 py-0.2 rounded font-mono font-bold uppercase",
                                isSelected ? "bg-red-700 text-red-100" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              MP4
                            </span>
                          </div>
                          {fmt.filesize_approx > 0 && (
                            <span
                              className={cn(
                                "text-[11px] font-normal",
                                isSelected ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              ~{formatBytes(fmt.filesize_approx)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={startDownload}
                  disabled={isDownloading}
                  className="gap-2 font-bold"
                  variant="gradient"
                  size="lg"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Downloading Media...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download {isAudioOnly ? "Audio (MP3)" : "Video (MP4)"}
                    </>
                  )}
                </Button>

                {downloadReadyPath && (
                  <Button
                    onClick={() => triggerFileSave(downloadReadyPath, activeTaskId)}
                    className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4" />
                    Download Again ({downloadReadyPath})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Real-time Task Progress Box */}
      {isDownloading && currentTask && (
        <Card className="border-red-500/30 bg-red-500/5 shadow-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-red-500 animate-spin" />
                {currentTask.phase || currentTask.status_message || (
                  currentTask.status === "finished"
                    ? "Download Complete! Preparing file..."
                    : "Downloading media fragments..."
                )}
              </span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400 text-base">
                {currentTask.progress}%
              </span>
            </div>

            <Progress value={currentTask.progress} className="h-3" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
              <div>
                <p className="text-zinc-400">Download Speed</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                  {currentTask.speed || "0 B/s"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">ETA</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                  {currentTask.eta || "Calculating..."}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Downloaded</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                  {formatBytes(currentTask.downloaded)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Estimated Total</p>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                  {formatBytes(currentTask.total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VideoDownloader