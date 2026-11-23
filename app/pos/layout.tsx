import * as React from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { POSHeaderNav } from "@/components/pos/POSHeaderNav"

export const dynamic = "force-dynamic"

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authData = await getCurrentUser()
  const profile = authData?.profile

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F3E9] text-[#30231E]">
      {/* Responsive POS Header & Touch Tabs */}
      <POSHeaderNav
        profileName={profile?.full_name || "Manager"}
        role={profile?.role === "ADMIN" ? "Admin" : "Store Manager"}
      />

      {/* Main Content Area: Zero horizontal overflow with fluid padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-3 md:p-4 lg:p-6 min-w-0">
        {children}
      </main>
    </div>
  )
}
