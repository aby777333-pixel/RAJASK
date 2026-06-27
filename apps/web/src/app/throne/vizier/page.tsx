import { getCourtContext } from "@/lib/court/data";
import { VizierChat } from "@/components/vizier/VizierChat";

export const dynamic = "force-dynamic";

export default async function VizierPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-ivory">Vizier</h1>
        <p className="text-sm text-ivory/50">Your AI chief of staff — grounded in the live realm.</p>
      </div>
      <VizierChat />
    </div>
  );
}
