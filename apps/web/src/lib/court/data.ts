import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_REALM_COOKIE = "rajask_realm";

export interface RealmMembership {
  realmId: string;
  realmName: string;
  realmSlug: string;
  companyId: string | null;
  isSovereign: boolean;
  titleName: string;
  titleKey: string | null;
}

export interface CourtContext {
  user: User | null;
  memberships: RealmMembership[];
  activeRealm: RealmMembership | null;
  isSuperAdmin: boolean;
}

/**
 * Resolves the signed-in user, the realms they belong to, and the active realm
 * (from the `rajask_realm` cookie, falling back to the first membership).
 * RLS guarantees only the user's own memberships and visible realms return.
 */
export async function getCourtContext(): Promise<CourtContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, memberships: [], activeRealm: null, isSuperAdmin: false };

  const { data: profile } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isSuperAdmin = profile?.is_super_admin ?? false;

  const { data } = await supabase
    .from("memberships")
    .select("realm_id, is_sovereign, company_id, titles(name, key), realms(id, name, slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null);

  const memberships: RealmMembership[] = (data ?? [])
    .filter((m) => m.realms && m.titles)
    .map((m) => {
      const realm = m.realms as unknown as { id: string; name: string; slug: string };
      const title = m.titles as unknown as { name: string; key: string | null };
      return {
        realmId: realm.id,
        realmName: realm.name,
        realmSlug: realm.slug,
        companyId: m.company_id,
        isSovereign: m.is_sovereign,
        titleName: title.name,
        titleKey: title.key,
      };
    });

  const cookieRealm = cookies().get(ACTIVE_REALM_COOKIE)?.value;
  const activeRealm =
    memberships.find((m) => m.realmId === cookieRealm) ?? memberships[0] ?? null;

  return { user, memberships, activeRealm, isSuperAdmin };
}
