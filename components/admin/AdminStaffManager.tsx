"use client"

import * as React from "react"
import { Users, UserPlus, Shield, Key, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate } from "@/lib/utils"

interface AdminStaffManagerProps {
  initialStaff: any[]
}

export function AdminStaffManager({ initialStaff }: AdminStaffManagerProps) {
  const [staff, setStaff] = React.useState<any[]>(initialStaff)
  const [showAddModal, setShowAddModal] = React.useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#43291F]">
            Staff & Role Management
          </h1>
          <p className="text-xs text-[#705B51] mt-0.5">
            Manage cafe managers, cashiers, and remote admin access permissions
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-xs bg-[#43291F] hover:bg-[#341F17] text-white"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1" />
          Create Staff Account
        </Button>
      </div>

      {/* Staff Table & Mobile Cards */}
      <Card className="border-[#E8DED0] bg-[#FFFDF8] shadow-sm overflow-hidden min-w-0">
        {/* Mobile Card List (< md) */}
        <div className="block md:hidden divide-y divide-[#E8DED0]">
          {staff.map((member) => (
            <div key={member.id} className="p-3.5 space-y-2 hover:bg-[#F8F3E9]/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-[#43291F]">{member.full_name}</h4>
                  <p className="text-[11px] text-[#705B51] mt-0.5">
                    Phone: {member.phone || "—"} • Created: {formatDate(member.created_at)}
                  </p>
                </div>
                <Badge
                  variant={member.is_active ? "success" : "destructive"}
                  className="text-[10px] shrink-0"
                >
                  {member.is_active ? "Active" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E8DED0]/60">
                <Badge
                  variant={member.role === "ADMIN" ? "terracotta" : "olive"}
                  className="text-[10px]"
                >
                  {member.role === "ADMIN" ? "Admin (Remote)" : "Shop Manager (POS)"}
                </Badge>

                <span className="text-[11px] text-[#705B51]">
                  {member.role === "ADMIN" ? "Full Business Suite" : "POS Billing & Stock Only"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F3E9] border-b border-[#E8DED0] font-serif font-bold text-[#43291F]">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Role Access</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED0]">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-[#F8F3E9]/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#43291F] text-sm">
                    {member.full_name}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={member.role === "ADMIN" ? "terracotta" : "olive"}
                      className="text-[10px]"
                    >
                      {member.role === "ADMIN" ? "Admin (Remote)" : "Shop Manager (POS)"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-[#705B51]">
                    {member.phone || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-[#705B51]">
                    {formatDate(member.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={member.is_active ? "success" : "destructive"}
                      className="text-[10px]"
                    >
                      {member.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right text-[11px] text-[#705B51]">
                    {member.role === "ADMIN"
                      ? "Full Business Suite"
                      : "POS Billing & Stock Only"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {staff.length === 0 && (
          <div className="py-14 text-center text-[#A09289]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-serif font-bold text-base text-[#43291F]">No Staff Profiles Found</p>
            <p className="text-xs text-[#705B51] mt-1">
              Create manager accounts for shop staff operating the POS terminal.
            </p>
          </div>
        )}
      </Card>

      {/* ── CREATE STAFF MODAL INSTRUCTIONS ── */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manager / Staff Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <p className="text-[#705B51]">
              In accordance with Supabase Security Architecture, manager accounts are authenticated via Supabase Auth with Row Level Security.
            </p>

            <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E8DED0] space-y-2">
              <span className="font-bold text-[#43291F] block">Secure Creation Steps:</span>
              <ol className="list-decimal list-inside space-y-1 text-[#705B51]">
                <li>Create user in Supabase Auth with email & password.</li>
                <li>Add profile record with role <code className="font-mono bg-white px-1">SHOP_MANAGER</code>.</li>
                <li>The manager can immediately sign in at <span className="font-bold text-[#43291F]">/login</span>.</li>
              </ol>
            </div>

            <Button
              onClick={() => setShowAddModal(false)}
              className="w-full bg-[#43291F] hover:bg-[#341F17] text-white"
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
