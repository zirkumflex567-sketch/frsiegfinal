import { redirect } from "next/navigation";
import { getCurrentAdminFromCookies } from "@/lib/auth/admin-auth";

export default async function AdminLivePage() {
  const admin = await getCurrentAdminFromCookies();

  if (!admin) {
    redirect("/admin/login");
  }

  redirect("/?edit=1");
}
