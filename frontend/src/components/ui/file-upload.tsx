import React, { useRef } from "react"
import { motion } from "framer-motion"
import { useDropzone } from "react-dropzone"
import { Upload, FileIcon, X } from "lucide-react"
import { cn, formatBytes } from "@/lib/utils"

export const FileUpload = ({
  files = [],
  onChange,
  onRemove,
  accept,
  multiple = true,
  maxFiles = 20,
  title = "Upload files",
  description = "Drag & drop your files here, or click to browse",
}: {
  files?: File[]
  onChange?: (files: File[]) => void
  onRemove?: (index: number) => void
  accept?: Record<string, string[]>
  multiple?: boolean
  maxFiles?: number
  title?: string
  description?: string
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple,
    maxFiles,
    accept,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles?.length) {
        onChange?.(multiple ? [...files, ...acceptedFiles] : acceptedFiles)
      }
    },
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "relative group/drop cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-300 text-center flex flex-col items-center justify-center",
          isDragActive
            ? "border-red-500 bg-red-500/10 scale-[1.01]"
            : "border-zinc-300 dark:border-zinc-700/80 hover:border-red-400/80 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/80"
        )}
      >
        <input {...getInputProps()} ref={fileInputRef} />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 shadow-sm border border-red-200/50 dark:border-red-800/50 group-hover/drop:scale-110 transition-transform duration-300">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              {title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              {description}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            Click or drag & drop
          </span>
        </div>
      </div>

      {/* Selected file pills/list */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((file, idx) => {
            const isImage = file.type.startsWith("image/")
            return (
              <motion.div
                key={`${file.name}-${idx}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm group"
              >
                {isImage ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-12 h-12 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-50 dark:bg-zinc-800 text-red-600 dark:text-red-400 border border-zinc-200 dark:border-zinc-700">
                    <FileIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatBytes(file.size)}
                  </p>
                </div>

                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(idx)
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
