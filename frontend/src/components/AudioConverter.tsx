import React, { useState } from "react"
import axios from "axios"
import confetti from "canvas-confetti"
import {
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Volume2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"
import { cn } from "@/lib/utils"
import { API_URL } from "../config"

const AUDIO_FORMATS = [
  { id: "mp3", label: "MP3 (Universal & Highly Compatible)" },
  { id: "wav", label: "WAV (Uncompressed Studio Lossless)" },
  { id: "aac", label: "AAC (High Quality Apple / Mobile)" },
  { id: "flac", label: "FLAC (High-Fidelity Lossless)" },
  { id: "ogg", label: "OGG (Vorbis Open Audio Format)" },
  { id: "m4a", label: "M4A (MPEG-4 Audio)" },
]

const BITRATES = [
  { id: "320k", label: "320 kbps (Extreme Quality)" },
  { id: "256k", label: "256 kbps (High Quality)" },
  { id: "192k", label: "192 kbps (Standard)" },
  { id: "128k", label: "128 kbps (Compact Size)" },
]

const AudioConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [targetFormat, setTargetFormat] = useState("mp3")
  const [bitrate, setBitrate] = useState("320k")
  const [isConverting, setIsConverting] = useState(false)
  const [convertedResult, setConvertedResult] = useState<{
    filename: string
    url: string
  } | null>(null)

  const handleConvert = async () => {
    if (files.length === 0) return
    setIsConverting(true)
    setConvertedResult(null)

    try {
      const formData = new FormData()
      formData.append("file", files[0])
      formData.append("output_format", targetFormat)
      formData.append("bitrate", bitrate)

      const res = await axios.post(`${API_URL}/api/convert-audio`, formData)
      if (res.data?.url) {
        setConvertedResult({
          filename: res.data.filename,
          url: res.data.url,
        })
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        })
      }
    } catch (err) {
      console.error("Audio conversion error:", err)
    } finally {
      setIsConverting(false)
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = `${API_URL}${url}`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-red-500/20 shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <FileUpload
            files={files}
            multiple={false}
            onChange={(newFiles) => setFiles(newFiles.slice(0, 1))}
            onRemove={() => {
              setFiles([])
              setConvertedResult(null)
            }}
            accept={{
              "audio/*": [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma"],
              "video/*": [".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv"],
            }}
            title="Upload Audio or Video File"
            description="Extract audio track from video or convert between audio formats"
          />

          {/* Target Format Pills */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Target Audio Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AUDIO_FORMATS.map((fmt) => {
                const isSelected = targetFormat === fmt.id
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setTargetFormat(fmt.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex flex-col gap-1",
                      isSelected
                        ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/25 scale-[1.02]"
                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-red-400"
                    )}
                  >
                    <span className="text-xs font-bold uppercase">{fmt.id}</span>
                    <span
                      className={cn(
                        "text-[11px] truncate",
                        isSelected ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"
                      )}
                    >
                      {fmt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bitrate Selector */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Audio Bitrate
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BITRATES.map((b) => {
                const isSelected = bitrate === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBitrate(b.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all",
                      isSelected
                        ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20"
                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-rose-400"
                    )}
                  >
                    <span className="text-xs font-bold block">{b.id}</span>
                    <span
                      className={cn(
                        "text-[10px]",
                        isSelected ? "text-rose-100" : "text-zinc-500"
                      )}
                    >
                      {b.label.split("(")[1]?.replace(")", "")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500">
              {files.length > 0 ? files[0].name : "No file chosen"}
            </span>

            <div className="flex items-center gap-3">
              {files.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiles([])
                    setConvertedResult(null)
                  }}
                  className="gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}

              <Button
                onClick={handleConvert}
                disabled={files.length === 0 || isConverting}
                variant="gradient"
                className="font-bold gap-2"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Converting Audio...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract & Convert Audio
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Card */}
      {convertedResult && (
        <Card className="border-red-500/30 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Audio Conversion Complete
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {convertedResult.filename}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {targetFormat.toUpperCase()} • {bitrate}
                  </p>
                </div>
              </div>

              {/* Audio preview player */}
              <audio
                controls
                src={`${API_URL}${convertedResult.url}`}
                className="h-10 w-full sm:w-64 shrink-0"
              />

              <Button
                onClick={() =>
                  downloadFile(convertedResult.url, convertedResult.filename)
                }
                className="gap-2 bg-red-600 hover:bg-red-700 text-white font-bold shrink-0 w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Download Audio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AudioConverter
