import React from "react"
import {
  FileText,
  ExternalLink,
  Split,
  Merge,
  FileCheck2,
  Lock,
  Stamp,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const PDF_FEATURES = [
  { icon: Merge, label: "Merge PDFs", desc: "Combine multiple documents into one" },
  { icon: Split, label: "Split PDF", desc: "Extract pages or split into intervals" },
  { icon: Stamp, label: "Add Watermarks", desc: "Text & image security watermarks" },
  { icon: FileCheck2, label: "PDF OCR", desc: "Convert scanned PDFs to searchable text" },
  { icon: Lock, label: "Security & Encryption", desc: "Password protect and decrypt files" },
  { icon: Sparkles, label: "Compress & Optimize", desc: "Reduce PDF size without quality loss" },
]

const PDFTools: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-red-500/20 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="p-8 sm:p-10 space-y-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Advanced PDF Suite
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Dedicated, high-performance portal powered by Stirling PDF
                </p>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              className="gap-2 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/25 shrink-0"
            >
              <a
                href="https://pdf.mikey.host"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Launch PDF Portal</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {PDF_FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.label}
                  className="p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 shadow-sm space-y-1.5 transition-all hover:border-red-400/60 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {feat.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {feat.desc}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500">
            <span>Hosted locally on the Mikey infrastructure</span>
            <a
              href="https://pdf.mikey.host"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1"
            >
              Open in new tab
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PDFTools