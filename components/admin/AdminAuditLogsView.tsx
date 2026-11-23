"use client"

import * as React from "react"
import {
  History,
  Search,
  Filter,
  User,
  ShieldAlert,
  ShieldCheck,
  ReceiptText,
  Boxes,
  Wallet,
  Clock,
  Eye,
  CheckCircle2,
  FileCode,
  Tag,
  Calendar,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateTime } from "@/lib/utils"

interface AdminAuditLogsViewProps {
  initialLogs: any[]
}

export function AdminAuditLogsView({ initialLogs = [] }: AdminAuditLogsViewProps) {
  const [logs] = React.useState<any[]>(initialLogs)
  const [filter, setFilter] = React.useState<string>("all")
  const [search, setSearch] = React.useState<string>("")
  const [selectedLog, setSelectedLog] = React.useState<any | null>(null)

  // Filtered logs
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      // Role filter
      if (filter === "manager") {
        const isManager = log.profiles?.role === "SHOP_MANAGER" || log.profiles?.role === "MANAGER"
        if (!isManager) return false
      } else if (filter === "closings") {
        if (!log.action_type.includes("CLOSING")) return false
      } else if (filter === "stock") {
        if (!log.action_type.includes("STOCK") && !log.action_type.includes("WASTAGE")) return false
      } else if (filter === "expenses") {
        if (!log.action_type.includes("EXPENSE")) return false
      } else if (filter === "auth") {
        if (!log.action_type.includes("LOGIN") && !log.action_type.includes("LOGOUT")) return false
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const actionMatch = (log.action_type || "").toLowerCase().includes(query)
        const tableMatch = (log.table_name || "").toLowerCase().includes(query)
        const userMatch = (log.profiles?.full_name || "").toLowerCase().includes(query)
        const roleMatch = (log.profiles?.role || "").toLowerCase().includes(query)
        const payloadMatch = JSON.stringify(log.new_value || log.old_value || {}).toLowerCase().includes(query)
        return actionMatch || tableMatch || userMatch || roleMatch || payloadMatch
      }
      return true
    })
  }, [logs, filter, search])

  // Aggregate statistics
  const managerLogsCount = React.useMemo(() => {
    return logs.filter((l) => l.profiles?.role === "SHOP_MANAGER" || l.profiles?.role === "MANAGER").length
  }, [logs])

  const closingLogsCount = React.useMemo(() => {
    return logs.filter((l) => l.action_type.includes("CLOSING")).length
  }, [logs])

  const financialLogsCount = React.useMemo(() => {
    return logs.filter(
      (l) =>
        l.action_type.includes("EXPENSE") ||
        l.action_type.includes("STOCK") ||
        l.action_type.includes("WASTAGE") ||
        l.action_type.includes("SALE")
    ).length
  }, [logs])

  // Action badge formatting
  const getActionBadge = (action: string) => {
    if (action.includes("CLOSING")) {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-[10px] font-bold">
          {action}
        </Badge>
      )
    }
    if (action.includes("STOCK") || action.includes("INWARD")) {
      return (
        <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-mono text-[10px] font-bold">
          {action}
        </Badge>
      )
    }
    if (action.includes("EXPENSE") || action.includes("WASTAGE")) {
      return (
        <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-mono text-[10px] font-bold">
          {action}
        </Badge>
      )
    }
    if (action.includes("LOGIN") || action.includes("AUTH")) {
      return (
        <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-mono text-[10px] font-bold">
          {action}
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-mono text-[10px] font-bold">
        {action}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="font-serif text-fluid-h1 font-bold text-[#43291F]">
            Tamper-Evident Audit Logs
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Real-time, cryptographically linked operational records of store manager activities, stock inward, expenses &amp; closings
          </p>
        </div>
      </div>

      {/* ── 4 Summary Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Audits Recorded */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#737B52]">
            Total System Events
          </span>
          <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
            {logs.length}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">Immutable database audit records</p>
        </Card>

        {/* 2. Manager Actions Tracked */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B56C4A]">
            Store Manager Events
          </span>
          <p className="font-serif text-2xl font-bold text-[#B56C4A] mt-1 font-mono">
            {managerLogsCount}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">Operations performed by counter staff</p>
        </Card>

        {/* 3. Register Closing Audits */}
        <Card className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Register Closings Logged
          </span>
          <p className="font-serif text-2xl font-bold text-amber-800 mt-1 font-mono">
            {closingLogsCount}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">End-of-day drawer reconciliations</p>
        </Card>

        {/* 4. Financial & Stock Modifiers */}
        <Card className="border-[#E8DED0] bg-[#FAF0EB] p-4 shadow-xs border-[#F3DDD2]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#43291F]">
            Inventory &amp; Cash Ops
          </span>
          <p className="font-serif text-2xl font-bold text-[#43291F] mt-1 font-mono">
            {financialLogsCount}
          </p>
          <p className="text-[11px] text-[#705B51] mt-0.5">Expenses, stock inward &amp; adjustments</p>
        </Card>
      </div>

      {/* ── Toolbar: Search & Filter Pills ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFDF8] p-3 rounded-xl border border-[#E8DED0] shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#705B51]" />
          <Input
            placeholder="Search action, manager, entity, payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-[#E8DED0] bg-[#F8F3E9] focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap ${
              filter === "all"
                ? "bg-[#43291F] text-white shadow-xs"
                : "bg-[#F8F3E9] text-[#705B51] hover:text-[#43291F] border border-[#E8DED0]"
            }`}
          >
            All Events ({logs.length})
          </button>
          <button
            onClick={() => setFilter("manager")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1.5 ${
              filter === "manager"
                ? "bg-[#B56C4A] text-white shadow-xs"
                : "bg-[#F8F3E9] text-[#B56C4A] hover:bg-[#FAF0EB] border border-[#E8DED0]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Manager Only ({managerLogsCount})
          </button>
          <button
            onClick={() => setFilter("closings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1.5 ${
              filter === "closings"
                ? "bg-amber-800 text-white shadow-xs"
                : "bg-[#F8F3E9] text-amber-800 hover:bg-amber-50 border border-amber-200"
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            Closings ({closingLogsCount})
          </button>
          <button
            onClick={() => setFilter("stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1.5 ${
              filter === "stock"
                ? "bg-blue-800 text-white shadow-xs"
                : "bg-[#F8F3E9] text-blue-800 hover:bg-blue-50 border border-blue-200"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Stock &amp; Wastage
          </button>
          <button
            onClick={() => setFilter("expenses")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] touch-manipulation whitespace-nowrap flex items-center gap-1.5 ${
              filter === "expenses"
                ? "bg-rose-800 text-white shadow-xs"
                : "bg-[#F8F3E9] text-rose-800 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Expenses
          </button>
        </div>
      </div>

      {/* ── Desktop Audit Table (>= 768px) ── */}
      <div className="hidden md:block">
        <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-bold text-[#43291F]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Audit Payload / Summary</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[#A09289]">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-serif font-bold text-base text-[#43291F]">No Audit Entries Found</p>
                      <p className="text-xs text-[#705B51] mt-1">
                        Try clearing search terms or selecting another activity filter.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isManager =
                      log.profiles?.role === "SHOP_MANAGER" || log.profiles?.role === "MANAGER"
                    return (
                      <tr key={log.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[#705B51] whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>

                        {/* Action Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getActionBadge(log.action_type)}
                        </td>

                        {/* Target Entity */}
                        <td className="py-3.5 px-4 font-mono text-[#705B51] whitespace-nowrap">
                          <span className="font-semibold text-[#43291F]">{log.table_name}</span>
                          {log.record_id && (
                            <span className="text-[10px] text-[#A09289] ml-1">
                              #{log.record_id.substring(0, 8)}
                            </span>
                          )}
                        </td>

                        {/* Performed By */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#43291F]">
                              {log.profiles?.full_name || "System Automation"}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${
                                isManager
                                  ? "border-amber-300 text-amber-800 bg-amber-50"
                                  : "border-emerald-300 text-emerald-800 bg-emerald-50"
                              }`}
                            >
                              {log.profiles?.role || "SYSTEM"}
                            </Badge>
                          </div>
                        </td>

                        {/* Payload Summary */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#705B51] max-w-sm truncate">
                          {JSON.stringify(log.new_value || log.old_value || {})}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLog(log)}
                            className="text-xs border-[#E8DED0] hover:bg-[#FAF0EB] text-[#43291F] min-h-[32px] touch-manipulation"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-[#B56C4A]" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Mobile Audit Cards (< 768px) ── */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <Card className="border-[#E8DED0] bg-[#FFFDF8] p-8 text-center text-[#A09289]">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-sm text-[#43291F]">No Audit Entries Found</p>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const isManager =
              log.profiles?.role === "SHOP_MANAGER" || log.profiles?.role === "MANAGER"
            return (
              <Card key={log.id} className="border-[#E8DED0] bg-[#FFFDF8] p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E8DED0] pb-2">
                  <div className="flex items-center gap-1.5">
                    {getActionBadge(log.action_type)}
                    <span className="text-[10px] font-mono text-[#705B51]">
                      {log.table_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#705B51]">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#705B51] uppercase font-bold block">
                      Performed By
                    </span>
                    <span className="font-bold text-[#43291F]">
                      {log.profiles?.full_name || "System"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      isManager
                        ? "border-amber-300 text-amber-800 bg-amber-50"
                        : "border-emerald-300 text-emerald-800 bg-emerald-50"
                    }`}
                  >
                    {log.profiles?.role || "SYSTEM"}
                  </Badge>
                </div>

                {/* Payload snippet */}
                <div className="bg-[#F8F3E9] p-2 rounded-lg font-mono text-[10px] text-[#705B51] truncate">
                  {JSON.stringify(log.new_value || log.old_value || {})}
                </div>

                <Button
                  size="sm"
                  onClick={() => setSelectedLog(log)}
                  className="w-full text-xs bg-[#43291F] hover:bg-[#341F17] text-white min-h-[36px] touch-manipulation"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Inspect Payload Details
                </Button>
              </Card>
            )
          })
        )}
      </div>

      {/* ── MODAL: INSPECT AUDIT ENTRY DETAILS ── */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-w-lg bg-[#FFFDF8] border-[#E8DED0] p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-[#E8DED0] pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-serif text-lg font-bold text-[#43291F]">
                    Audit Entry Inspection
                  </DialogTitle>
                  <p className="text-xs text-[#705B51] mt-0.5 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
                {getActionBadge(selectedLog.action_type)}
              </div>
            </DialogHeader>

            <div className="py-4 space-y-4 text-xs">
              {/* Event Metadata Card */}
              <div className="bg-[#F8F3E9] p-3 rounded-xl border border-[#E8DED0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#705B51]">Recorded Timestamp:</span>
                  <span className="font-mono font-bold text-[#43291F]">
                    {formatDateTime(selectedLog.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#705B51]">Actor / User:</span>
                  <span className="font-bold text-[#43291F]">
                    {selectedLog.profiles?.full_name || "System"} ({selectedLog.profiles?.role || "SYSTEM"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#705B51]">Database Target:</span>
                  <span className="font-mono font-semibold text-[#43291F]">
                    {selectedLog.table_name} {selectedLog.record_id ? `(ID: ${selectedLog.record_id})` : ""}
                  </span>
                </div>
              </div>

              {/* Payload JSON View */}
              {selectedLog.new_value && (
                <div className="space-y-1">
                  <span className="font-bold text-[#43291F] uppercase text-[10px] tracking-wider block">
                    Recorded New Value / Payload
                  </span>
                  <pre className="bg-[#1E1E1E] text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.old_value && (
                <div className="space-y-1">
                  <span className="font-bold text-[#43291F] uppercase text-[10px] tracking-wider block">
                    Pre-Existing Old Value (Before Modification)
                  </span>
                  <pre className="bg-[#1E1E1E] text-amber-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
