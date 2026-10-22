import React, { useState } from "react"
import axios from "axios"
import confetti from "canvas-confetti"
import {
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { FileUpload } from "@/components/ui/file-upload"
import { cn } from "@/lib/utils"
import { API_URL } from "../config"

interface ProcessedFile {
  filename: string
  url: string
}

const SUPPORTED_FORMATS = [
  { id: "webp", label: "WebP (Modern & Lightweight)", ext: ".webp" },
  { id: "png", label: "PNG (Lossless with Transparency)", ext: ".png" },
  { id: "jpg", label: "JPEG / JPG (Standard Photo)", ext: ".jpg" },
  { id: "avif", label: "AVIF (Next-Gen High Efficiency)", ext: ".avif" },
  { id: "ico", label: "ICO (Favicon & Icons)", ext: ".ico" },
  { id: "bmp", label: "BMP (Uncompressed Bitmap)", ext: ".bmp" },
]

const ImageConverter: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState("webp")
  const [quality, setQuality] = useState(85)
  const [width, setWidth] = useState<string>("")
  const [height, setHeight] = useState<string>("")
  const [maintainRatio, setMaintainRatio] = useState(true)
  const [stripMetadata, setStripMetadata] = useState(true)
  const [filterType] = useState("none")
  const [rotation, setRotation] = useState(0)

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])

  const handleConvert = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))
      formData.append("format", format)
      formData.append("quality", quality.toString())
      if (width) formData.append("width", width)
      if (height) formData.append("height", height)
      formData.append("maintain_aspect_ratio", maintainRatio.toString())
      formData.append("strip_metadata", stripMetadata.toString())
      formData.append("filter_type", filterType)
      formData.append("rotation", rotation.toString())

      const res = await axios.post(`${API_URL}/api/convert-image`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setProgress(percentCompleted)
          }
        },
      })

      if (res.data?.files) {
        setProcessedFiles(res.data.files)
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        })
      }
    } catch (err) {
      console.error("Image conversion error:", err)
    } finally {
      setIsProcessing(false)
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
      {/* Upload & Format Selector Card */}
      <Card className="border-red-500/20 shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <FileUpload
            files={files}
            onChange={(newFiles) => setFiles(newFiles)}
            onRemove={(idx) => {
              setFiles((prev) => prev.filter((_, i) => i !== idx))
              setProcessedFiles([])
            }}
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".ico", ".bmp", ".gif"] }}
            title="Upload Images to Convert & Compress"
            description="Drag & drop multiple images (PNG, JPG, WebP, etc.)"
          />

          {/* Target Format Pills */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Target Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_FORMATS.map((fmt) => {
                const isSelected = format === fmt.id
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
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

          {/* Fine-Tuning Controls Accordion / Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
            {/* Quality Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Image Quality
                </span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {quality}%
                </span>
              </div>
              <Slider
                value={[quality]}
                max={100}
                min={10}
                step={1}
                onValueChange={(val) => setQuality(val[0])}
              />
              <p className="text-[11px] text-zinc-500">
                Lower quality yields smaller file sizes (great for WebP & JPEG).
              </p>
            </div>

            {/* Resize Inputs */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Custom Dimensions (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setMaintainRatio(!maintainRatio)}
                  className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold"
                >
                  {maintainRatio ? (
                    <>
                      <Lock className="w-3 h-3" /> Keep Aspect Ratio
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" /> Free Ratio
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Width (px)"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-zinc-400">×</span>
                <input
                  type="number"
                  placeholder="Height (px)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Rotation and Filters */}
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Rotation: {rotation}°
              </span>
              <div className="flex gap-1.5">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotation(deg)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors",
                      rotation === deg
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Strip metadata switch */}
            <div className="flex items-center justify-between text-xs pt-2">
              <div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">
                  Strip EXIF Metadata
                </p>
                <p className="text-[11px] text-zinc-500">
                  Reduces file size and enhances privacy
                </p>
              </div>
              <Switch
                checked={stripMetadata}
                onCheckedChange={(checked) => setStripMetadata(checked)}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <span className="text-xs text-zinc-500">
              {files.length} {files.length === 1 ? "file" : "files"} queued
            </span>

            <div className="flex items-center gap-3">
              {files.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiles([])
                    setProcessedFiles([])
                  }}
                  className="gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}

              <Button
                onClick={handleConvert}
                disabled={files.length === 0 || isProcessing}
                variant="gradient"
                className="font-bold gap-2"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Converting Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Convert to {format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-500">
                <span>Processing conversions...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {processedFiles.length > 0 && (
        <Card className="border-emerald-500/30 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Successfully Converted {processedFiles.length}{" "}
                {processedFiles.length === 1 ? "Image" : "Images"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {processedFiles.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={`${API_URL}${file.url}`}
                      alt={file.filename}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-700 shrink-0"
                    />
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {file.filename}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => downloadFile(file.url, file.filename)}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs px-2.5 py-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ImageConverter