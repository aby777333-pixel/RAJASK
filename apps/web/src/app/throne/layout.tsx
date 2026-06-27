import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCourtContext } from "@/lib/court/data";

export default async function ThroneLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, activeRealm, isSuperAdmin } = await getCourtContext();
  if (!user) redirect("/auth");

  return (
    <AppShell
      email={user.email ?? ""}
      memberships={memberships}
      activeRealmId={activeRealm?.realmId ?? null}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </AppShell>
  );
}
