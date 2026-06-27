import { notFound } from "next/navigation";
import { Badge } from "@rajask/ui";
import { getCourtContext } from "@/lib/court/data";
import { getConversationHeader, getMessages } from "@/lib/courier/data";
import { ChatThread } from "@/components/courier/ChatThread";
import { CallButton } from "@/components/courier/CallButton";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const { user } = await getCourtContext();
  if (!user) notFound();

  const header = await getConversationHeader(params.conversationId, user.id);
  if (!header) notFound(); // RLS hides conversations the user isn't in

  const messages = await getMessages(params.conversationId);

  const memberNames: Record<string, string> = {};
  for (const m of header.members) memberNames[m.userId] = m.name;
  const meName = memberNames[user.id] ?? user.email ?? "You";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-lg text-ivory">
            <span className="text-ivory/30">{header.kind === "dm" ? "@" : "#"}</span>
            {header.title}
          </h1>
          {header.topic && <p className="text-xs text-ivory/40">{header.topic}</p>}
        </div>
        <div className="flex items-center gap-2">
          <CallButton conversationId={header.id} />
          <Badge>{header.memberCount} member{header.memberCount === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ChatThread
          conversationId={header.id}
          realmId={header.realmId}
          meId={user.id}
          meName={meName}
          memberNames={memberNames}
          initial={messages}
        />
      </div>
    </div>
  );
}
