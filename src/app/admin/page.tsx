import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdminFromCookies } from "@/lib/auth/admin-auth";
import { LogoutButton } from "./logout-button";
import { PagesManager } from "./pages-manager";

export default async function AdminHomePage() {
  const admin = await getCurrentAdminFromCookies();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CMS Dashboard</h1>
          <p className="text-sm text-neutral-600">
            Eingeloggt als {admin.email} ({admin.role})
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="mb-6 flex gap-2">
        <Link href="/?edit=1" className="rounded-md border px-4 py-2 text-sm">
          Live-Editor öffnen
        </Link>
      </div>

      <PagesManager />
    </main>
  );
}
