import { getStaffList } from "@/lib/actions/settings"
import { AdminStaffManager } from "@/components/admin/AdminStaffManager"

export default async function AdminStaffPage() {
  const staff = await getStaffList()

  return <AdminStaffManager initialStaff={staff} />
}
