import { Coffee, Loader2 } from "lucide-react"

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F8F3E9] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow-lg">
            <Coffee className="w-7 h-7 text-[#FAF0EB] animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-[#B56C4A] absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center">
          <h2 className="font-serif font-bold text-lg text-[#43291F]">
            Heaven&apos;s Cafe
          </h2>
          <p className="text-xs text-[#705B51] flex items-center justify-center gap-1.5 mt-0.5">
            Loading...
          </p>
        </div>
      </div>
    </div>
  )
}
