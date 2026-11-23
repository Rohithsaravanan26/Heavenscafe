import { Loader2, Coffee } from "lucide-react"

export default function POSLoading() {
  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 w-full space-y-4 animate-in fade-in duration-200">
      {/* Skeleton Top Category/Action Bar */}
      <div className="flex gap-2 overflow-hidden py-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-lg bg-[#EFE7DA] animate-pulse shrink-0"
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-[#E8DED0] bg-[#FFFDF8] p-10 shadow-sm flex flex-col items-center justify-center min-h-[420px]">
        <div className="relative mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow">
            <Coffee className="w-6 h-6 animate-pulse text-[#FAF0EB]" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#B56C4A] absolute -bottom-1 -right-1" />
        </div>
        <p className="font-serif font-bold text-sm text-[#43291F]">
          Loading POS Screen...
        </p>
        <p className="text-xs text-[#705B51] mt-0.5">
          Preparing terminal for Heaven&apos;s Cafe operations
        </p>
      </div>
    </div>
  )
}
