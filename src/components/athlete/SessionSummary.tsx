import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Share2, Trophy } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SessionSummaryData {
  workoutName: string;
  elapsed: string;
  workingSets: number;
  totalSets: number;
  volumeKg: number;
  records: { exercise: string; value: string }[];
}

interface Props {
  data: SessionSummaryData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  finishing: boolean;
  onFinish: (feedback: { rpe?: number; notes: string }) => void;
  onShare: (feedback: { rpe?: number; notes: string }) => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Full-screen recap after saving a strength session, with effort + note for the coach. */
const SessionSummary = ({ data, t, finishing, onFinish, onShare }: Props) => {
  const ts = t.athlete.session.summary;
  const { language } = useLanguage();
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const stats = [
    { label: ts.time, value: data.elapsed },
    { label: ts.sets, value: `${data.workingSets}/${data.totalSets}` },
    { label: ts.volume, value: data.volumeKg > 0 ? `${Math.round(data.volumeKg).toLocaleString(language === "pt" ? "pt-BR" : "en")} kg` : "—" },
    { label: ts.records, value: String(data.records.length) },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="max-w-lg mx-auto px-4 pt-10 pb-10 space-y-6"
      >
        <div className="text-center space-y-1">
          <div className="text-5xl">💪</div>
          <h1 className="text-2xl font-bold">{ts.title}</h1>
          <p className="text-muted-foreground text-balance">{data.workoutName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {data.records.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
              {ts.newRecords}
            </p>
            {data.records.map((record) => (
              <div key={record.exercise} className="flex items-center justify-between text-sm">
                <span className="truncate pr-3">{record.exercise}</span>
                <span className="font-semibold tabular-nums shrink-0">{record.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Perceived effort */}
        <div className="space-y-2">
          <p className="font-semibold">{ts.rpeQuestion}</p>
          <div className="grid grid-cols-10 gap-1">
            {RPE_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setRpe(value === rpe ? undefined : value)}
                className={cn(
                  "h-11 rounded-lg text-sm font-semibold tabular-nums transition-colors",
                  rpe === value
                    ? value >= 9
                      ? "bg-red-500 text-white"
                      : value >= 7
                        ? "bg-amber-500 text-white"
                        : "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70"
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{ts.rpeEasy}</span>
            <span>{ts.rpeMax}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold">{ts.notesLabel}</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={ts.notesPlaceholder}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full h-12 text-base" onClick={() => onFinish({ rpe, notes })} disabled={finishing}>
            {finishing && <Spinner size="xs" className="mr-2" />}
            {ts.finish}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onShare({ rpe, notes })} disabled={finishing}>
            <Share2 className="h-4 w-4 mr-2" />
            {ts.share}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SessionSummary;
