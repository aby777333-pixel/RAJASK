import { redirect } from "next/navigation";
import { getCourtContext } from "@/lib/court/data";
import { listConversations, getRealmPeople } from "@/lib/courier/data";
import { CourierSidebar } from "@/components/courier/CourierSidebar";

export const dynamic = "force-dynamic";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const { user, activeRealm } = await getCourtContext();
  if (!user) redirect("/auth");
  if (!activeRealm) redirect("/throne");

  const [conversations, people] = await Promise.all([
    listConversations(activeRealm.realmId, user.id),
    getRealmPeople(activeRealm.realmId, user.id),
  ]);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      <aside className="w-72 shrink-0 rounded-regal border border-white/8 bg-obsidian-100 p-3">
        <CourierSidebar conversations={conversations} people={people} />
      </aside>
      <section className="min-w-0 flex-1 rounded-regal border border-white/8 bg-obsidian-100 p-4">
        {children}
      </section>
    </div>
  );
}
