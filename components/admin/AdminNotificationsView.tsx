"use client"

import * as React from "react"
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/actions/notifications"
import { formatDateTime } from "@/lib/utils"

interface AdminNotificationsViewProps {
  initialNotifications: any[]
}

export function AdminNotificationsView({ initialNotifications }: AdminNotificationsViewProps) {
  const [notifications, setNotifications] = React.useState<any[]>(initialNotifications)
  const [loading, setLoading] = React.useState(false)

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err: unknown) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    setLoading(true)
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Automatic alerts for low raw material stock, cash discrepancies & daily closing events
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={loading}
            className="text-xs border-[#E8DED0] hover:bg-[#F8F3E9] text-[#43291F]"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1 text-[#737B52]" />
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={`border shadow-xs transition-colors ${
              n.is_read
                ? "bg-[#FFFDF8] border-[#E8DED0]"
                : "bg-[#FAF0EB] border-[#F3DDD2]"
            }`}
          >
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {n.type === "out_of_stock" || n.type === "critical_stock" ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : n.type === "discrepancy" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-[#B56C4A]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-sm text-[#43291F]">
                      {n.title}
                    </h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#B56C4A]" />
                    )}
                  </div>
                  <p className="text-xs text-[#705B51] mt-1">{n.message}</p>
                  <span className="text-[10px] text-[#A09289] mt-2 block font-mono">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  title="Mark as read"
                  className="text-xs text-[#737B52] hover:text-[#43291F] font-semibold whitespace-nowrap px-2.5 py-1 rounded hover:bg-white border border-[#E8DED0]"
                >
                  Mark Read
                </button>
              )}
            </div>
          </Card>
        ))}

        {notifications.length === 0 && (
          <div className="py-16 text-center text-[#A09289] bg-[#FFFDF8] rounded-xl border border-[#E8DED0] p-8">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-base text-[#43291F]">All Caught Up!</p>
            <p className="text-xs text-[#705B51] mt-1">
              No low-stock or cash discrepancy alerts at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
