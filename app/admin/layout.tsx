import * as React from "react"
import { getCurrentUser } from "@/lib/actions/auth"
import { getNotifications } from "@/lib/actions/notifications"
import { getLowStockCount } from "@/lib/actions/inventory"
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authData, notifications, lowStockCount] = await Promise.all([
    getCurrentUser(),
    getNotifications(true), // unread only
    getLowStockCount(),
  ])

  const profile = authData?.profile
  const unreadCount = notifications?.length || 0

  return (
    <AdminSidebarNav
      profileName={profile?.full_name || "Admin"}
      role={profile?.role === "ADMIN" ? "Remote Owner" : "Manager"}
      unreadCount={unreadCount}
      lowStockCount={lowStockCount}
    >
      {children}
    </AdminSidebarNav>
  )
}
