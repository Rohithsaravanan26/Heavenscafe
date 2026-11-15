import { getAuditLogs } from "@/lib/actions/analytics"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, ShieldAlert } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default async function AdminAuditPage() {
  const auditLogs = await getAuditLogs(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#43291F]">
          Tamper-Evident Audit Logs
        </h1>
        <p className="text-xs text-[#705B51] mt-0.5">
          Traceable history of all commercial sales, price changes, stock adjustments & security events
        </p>
      </div>

      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Audit Payload / Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {auditLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#705B51]">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {log.action_type}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#705B51]">
                    {log.table_name} {log.record_id ? `#${log.record_id.substring(0, 8)}...` : ""}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#43291F]">
                    {log.profiles?.full_name || "System"} ({log.profiles?.role || "SYSTEM"})
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#705B51] max-w-xs truncate">
                    {JSON.stringify(log.new_value || log.old_value || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {auditLogs.length === 0 && (
          <div className="py-14 text-center text-[#A09289]">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-base text-[#43291F]">No Audit Entries Logged Yet</p>
            <p className="text-xs text-[#705B51] mt-1">
              Events will be appended automatically as sales, stock and price modifications happen.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
