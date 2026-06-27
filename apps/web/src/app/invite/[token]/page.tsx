import Link from "next/link";
import { Logo, SpectrumBar, Button } from "@rajask/ui";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/court/actions";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let detail: { realm_name: string; title_name: string; status: string; expired: boolean } | null =
    null;
  if (user) {
    const { data } = await supabase.rpc("rajask_open_invitation", { p_token: params.token });
    detail = (data && data[0]) || null;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-obsidian px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div className="font-display text-2xl tracking-wide text-ivory">RAJASK</div>
        </div>

        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-6 text-center shadow-throne">
          {!user ? (
            <>
              <h1 className="text-lg font-semibold text-ivory">You've been summoned</h1>
              <p className="mt-2 text-sm text-ivory/55">
                Sign in or create an account to view and accept your invitation.
              </p>
              <Link href={`/auth?next=/invite/${params.token}`}>
                <Button className="mt-4 w-full">Sign in to continue</Button>
              </Link>
            </>
          ) : !detail ? (
            <>
              <h1 className="text-lg font-semibold text-ivory">Invitation not found</h1>
              <p className="mt-2 text-sm text-ivory/55">
                This invitation link is invalid or has been withdrawn.
              </p>
              <Link href="/throne">
                <Button variant="outline" className="mt-4 w-full">
                  Go to your throne
                </Button>
              </Link>
            </>
          ) : detail.status === "activated" ? (
            <>
              <h1 className="text-lg font-semibold text-ivory">Already accepted</h1>
              <p className="mt-2 text-sm text-ivory/55">
                You are already a member of {detail.realm_name}.
              </p>
              <Link href="/throne">
                <Button className="mt-4 w-full">Enter the realm</Button>
              </Link>
            </>
          ) : detail.expired || detail.status === "revoked" ? (
            <>
              <h1 className="text-lg font-semibold text-ivory">Invitation expired</h1>
              <p className="mt-2 text-sm text-ivory/55">
                This invitation to {detail.realm_name} is no longer valid.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-ivory">Join {detail.realm_name}</h1>
              <p className="mt-2 text-sm text-ivory/55">
                You are invited to serve as <span className="text-ivory">{detail.title_name}</span>.
              </p>
              <form action={acceptInvitation.bind(null, params.token)}>
                <Button type="submit" className="mt-4 w-full">
                  Accept &amp; enter the court
                </Button>
              </form>
            </>
          )}
        </div>
        <SpectrumBar className="mt-6" />
      </div>
    </div>
  );
}
