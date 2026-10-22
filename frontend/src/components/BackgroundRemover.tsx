import React, { useState } from "react"
import axios from "axios"
import confetti from "canvas-confetti"
import {
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FileUpload } from "@/components/ui/file-upload"
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider"
import { API_URL } from "../config"

interface ProcessedFile {
  filename: string
  url: string
}

const BackgroundRemover: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)

  const handleRemoveBackground = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      const res = await axios.post(`${API_URL}/api/remove-background`, formData, {
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
        setActivePreviewIndex(0)
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        })
      }
    } catch (err) {
      console.error("Background removal error:", err)
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
      {/* Upload Zone */}
      <Card className="border-red-500/20 shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <FileUpload
            files={files}
            onChange={(newFiles) => setFiles(newFiles)}
            onRemove={(idx) => {
              setFiles((prev) => prev.filter((_, i) => i !== idx))
              setProcessedFiles([])
            }}
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
            title="Upload Images for AI Background Removal"
            description="Supports PNG, JPG, JPEG, and WebP (up to 20 files at once)"
          />

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Sparkles className="w-4 h-4 text-red-500" />
              <span>Powered by high-precision ONNX AI engine</span>
            </div>

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
                  Clear All
                </Button>
              )}

              <Button
                onClick={handleRemoveBackground}
                disabled={files.length === 0 || isProcessing}
                variant="gradient"
                className="font-bold gap-2"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing {files.length} {files.length === 1 ? "Image" : "Images"}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Remove Background ({files.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-500">
                <span>Uploading & Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Before / After Comparison */}
      {processedFiles.length > 0 && files[activePreviewIndex] && (
        <Card className="border-red-500/30 overflow-hidden shadow-2xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Interactive Before / After Comparison
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Drag the slider handle to inspect cutout details
                </p>
              </div>

              <Button
                onClick={() =>
                  downloadFile(
                    processedFiles[activePreviewIndex].url,
                    processedFiles[activePreviewIndex].filename
                  )
                }
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                Download Cutout (PNG)
              </Button>
            </div>

            <ImageComparisonSlider
              originalImage={URL.createObjectURL(files[activePreviewIndex])}
              processedImage={`${API_URL}${processedFiles[activePreviewIndex].url}`}
            />

            {/* Thumbnail selector for batch cutouts */}
            {processedFiles.length > 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  Select image to compare ({activePreviewIndex + 1} of{" "}
                  {processedFiles.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {processedFiles.map((proc, idx) => (
                    <button
                      key={proc.filename}
                      type="button"
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        activePreviewIndex === idx
                          ? "border-red-600 scale-105 shadow-md"
                          : "border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={`${API_URL}${proc.url}`}
                        alt={proc.filename}
                        className="w-full h-full object-cover bg-checkerboard"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BackgroundRemover