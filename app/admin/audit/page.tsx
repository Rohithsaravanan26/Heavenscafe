import { getAuditLogs } from "@/lib/actions/analytics"
import { AdminAuditLogsView } from "@/components/admin/AdminAuditLogsView"

export const dynamic = "force-dynamic"

export default async function AdminAuditPage() {
  const auditLogs = await getAuditLogs(150)

  return <AdminAuditLogsView initialLogs={auditLogs} />
}
