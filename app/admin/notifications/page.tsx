import { getNotifications } from "@/lib/actions/notifications"
import { AdminNotificationsView } from "@/components/admin/AdminNotificationsView"

export default async function AdminNotificationsPage() {
  const notifications = await getNotifications(false) // all notifications

  return <AdminNotificationsView initialNotifications={notifications} />
}
