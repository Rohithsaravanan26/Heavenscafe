import { Loader2, Coffee } from "lucide-react"

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Skeleton Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[#EFE7DA] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-[#EFE7DA]/70 rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-[#EFE7DA] rounded-lg animate-pulse" />
      </div>

      {/* 4 Skeleton Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-[#E8DED0] bg-[#FFFDF8] shadow-xs space-y-2"
          >
            <div className="h-3 w-20 bg-[#EFE7DA] rounded animate-pulse" />
            <div className="h-7 w-28 bg-[#EFE7DA] rounded-lg animate-pulse" />
            <div className="h-3 w-32 bg-[#EFE7DA]/70 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Skeleton Table / Chart Card with Spinner */}
      <div className="rounded-2xl border border-[#E8DED0] bg-[#FFFDF8] p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <div className="relative mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#43291F] text-[#FFFDF8] flex items-center justify-center shadow">
            <Coffee className="w-6 h-6 animate-pulse text-[#FAF0EB]" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#B56C4A] absolute -bottom-1 -right-1" />
        </div>
        <p className="font-serif font-bold text-sm text-[#43291F]">
          Loading Data...
        </p>
        <p className="text-xs text-[#705B51] mt-0.5">
          Retrieving live records from Heaven&apos;s Cafe database
        </p>
      </div>
    </div>
  )
}
