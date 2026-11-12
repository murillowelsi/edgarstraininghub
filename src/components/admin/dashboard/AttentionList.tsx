import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarPlus, Check, Eye, Loader2, MessageSquare, Send } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ChatService } from "@/services/chat";
import type { User } from "@/types/user";

export type AttentionReason =
  | { kind: "overdue"; count: number }
  | { kind: "skipped"; count: number }
  | { kind: "highEffort"; rpe: number; assignmentId: string }
  | { kind: "note"; text: string; assignmentId: string }
  | { kind: "noPlan" };

export interface AttentionItem {
  athlete: User;
  reasons: AttentionReason[];
}

/**
 * "Who needs me?" (CD-1): each athlete with the reasons the dashboard already
 * computes as chips, and the action for them: Reply (a quick reply right in the
 * card, sent to the athlete's chat), View workout, Assign. Scrolls inside when long.
 */
export function AttentionList({ items, onAssign }: { items: AttentionItem[]; onAssign: (athleteId: string) => void }) {
  const { t } = useLanguage();
  const tv = t.admin.dashboard.v2;
  return (
    <section aria-labelledby="dash-attention" className="flex h-full min-h-0 flex-col rounded-[20px] border border-destructive-ink/35 bg-card">
      <h2 id="dash-attention" className="flex items-center gap-2 px-4 pb-2 pt-4 text-base font-bold">
        {t.admin.dashboard.needsAttention}
        {items.length > 0 && (
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-bold tabular-nums text-destructive-ink">{items.length}</span>
        )}
      </h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 pb-4 text-sm font-medium text-success-ink">
          <Check className="h-4 w-4" aria-hidden />
          {tv.allGood}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 lg:max-h-[640px]">
          {items.map((item) => (
            <AttentionCard key={item.athlete.id} item={item} onAssign={() => onAssign(item.athlete.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionCard({ item, onAssign }: { item: AttentionItem; onAssign: () => void }) {
  const { t } = useLanguage();
  const ta = t.admin.dashboard.attention;
  const tv = t.admin.dashboard.v2;
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [chatId, setChatId] = useState<string | null>(null);
  const { athlete, reasons } = item;

  const onlyNoPlan = reasons.every((r) => r.kind === "noPlan");
  const workoutRef = reasons.find((r): r is Extract<AttentionReason, { assignmentId: string }> => "assignmentId" in r);
  const workoutHref = workoutRef ? `/admin/athletes/${athlete.id}/activity/${workoutRef.assignmentId}` : `/admin/athletes/${athlete.id}`;
  const draftKey = (id: string) => `ez-chat-draft-v1:${id}`;

  const send = async () => {
    if (!user || !text.trim()) return;
    setState("sending");
    try {
      const chat = await ChatService.createOrGetChat(athlete.id, athlete.displayName, user.uid);
      await ChatService.sendMessage(chat.id, user.uid, text.trim(), displayName || user.email || "Coach");
      setChatId(chat.id);
      setText("");
      setReplyOpen(false);
      setState("sent");
    } catch {
      setState("error");
    }
  };

  // Esc / closing keeps what was typed as the chat's draft (same key the chat window reads)
  const close = () => {
    if (user && text.trim()) {
      try {
        sessionStorage.setItem(draftKey(`${athlete.id}_${user.uid}`), text);
      } catch {
        /* private mode */
      }
    }
    setReplyOpen(false);
  };

  return (
    <li className="rounded-2xl border bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <CachedAvatar src={athlete.photoURL} alt={athlete.displayName} fallback={athlete.displayName.charAt(0).toUpperCase()} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <Link to={`/admin/athletes/${athlete.id}`} className="block truncate text-sm font-semibold hover:underline">
            {athlete.displayName}
          </Link>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {reasons.map((r, i) => (
              <ReasonChip key={i} reason={r} labels={{ ...ta, note: tv.note, noPlanLong: ta.noPlan }} />
            ))}
          </div>
          {reasons.map((r) =>
            r.kind === "note" ? (
              <p key="q" className="mt-1.5 line-clamp-1 text-sm italic text-muted-foreground">“{r.text}”</p>
            ) : null
          )}
        </div>
      </div>

      {replyOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="mt-2.5 flex items-center gap-2"
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && close()}
            onBlur={(e) => {
              if (!e.currentTarget.form?.contains(e.relatedTarget as Node)) close();
            }}
            placeholder={tv.replyPlaceholder.replace("{{name}}", athlete.displayName.split(" ")[0])}
            aria-label={tv.replyPlaceholder.replace("{{name}}", athlete.displayName)}
            className="h-10 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={!text.trim() || state === "sending"}
            aria-label={tv.send}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
          >
            {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[52px]">
          {state === "sent" ? (
            <span className="flex items-center gap-1.5 text-sm text-success-ink">
              <Check className="h-4 w-4" aria-hidden />
              {tv.sent} ·
              <button type="button" className="font-semibold text-primary-ink" onClick={() => navigate("/admin/chat", { state: { openChatId: chatId } })}>
                {tv.openChat}
              </button>
            </span>
          ) : onlyNoPlan ? (
            <ActionButton icon={CalendarPlus} label={ta.plan} onClick={onAssign} primary />
          ) : (
            <>
              <ActionButton icon={MessageSquare} label={tv.reply} onClick={() => setReplyOpen(true)} primary />
              <Link to={workoutHref} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                <Eye className="h-4 w-4" aria-hidden />
                {tv.viewWorkout}
              </Link>
              {reasons.some((r) => r.kind === "noPlan") && <ActionButton icon={CalendarPlus} label={ta.plan} onClick={onAssign} />}
            </>
          )}
          {state === "error" && <span role="alert" className="text-xs text-destructive-ink">{tv.sendError}</span>}
        </div>
      )}
    </li>
  );
}

function ActionButton({ icon: Icon, label, onClick, primary }: { icon: React.ElementType; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors",
        primary ? "bg-primary/15 text-primary-ink hover:bg-primary/25 dark:bg-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function ReasonChip({
  reason,
  labels,
}: {
  reason: AttentionReason;
  labels: { overdue: string; skipped: string; highEffort: string; note: string; noPlanLong: string };
}) {
  const base = "rounded-full px-2 py-0.5 text-[11px] font-semibold";
  switch (reason.kind) {
    case "overdue":
      return <span className={cn(base, "bg-destructive/15 text-destructive-ink")}>{labels.overdue.replace("{{n}}", String(reason.count))}</span>;
    case "skipped":
      return <span className={cn(base, "bg-destructive/15 text-destructive-ink")}>{labels.skipped.replace("{{n}}", String(reason.count))}</span>;
    case "highEffort":
      return (
        <span className={cn(base, "bg-sport-strength/15 text-sport-strength")}>{labels.highEffort.replace("{{n}}", String(reason.rpe))}</span>
      );
    case "note":
      return <span className={cn(base, "bg-foreground/[0.07] text-foreground/80")}>{labels.note}</span>;
    case "noPlan":
      return <span className={cn(base, "bg-warning/15 text-warning-ink")}>{labels.noPlanLong}</span>;
  }
}
