import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { WorkoutSummaryCard } from "@/components/timeline/WorkoutSummaryCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { renderStoryImage, shareOrDownloadImage, type ShareImageFormat } from "@/lib/postImages";
import type { WorkoutSummary } from "@/types/timeline";
import type { WorkoutType } from "@/types/workout";
import { summaryStats } from "@/utils/workoutSummaryStats";
import { Camera, Check, ImagePlus, LayoutGrid, Loader2, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: WorkoutSummary;
  /** The athlete already posted this workout on the feed */
  alreadyPosted?: boolean;
  onPostToFeed: () => void;
}

/**
 * One place to share a finished workout, at any time: post it on the feed
 * (again, if they skipped it earlier) or create an image for other apps.
 */
const ShareWorkoutSheet = ({ open, onOpenChange, summary, alreadyPosted, onPostToFeed }: Props) => {
  const { t, language } = useLanguage();
  const ts = t.athlete.share;
  const { displayName, user } = useAuth();
  const { toast } = useToast();
  const [format, setFormat] = useState<ShareImageFormat>("story");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [rendering, setRendering] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setPhotoUrl(null);
      setPreview(null);
    }
  }, [open]);

  // Live preview of the final image: photo + workout stats on top
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRendering(true);
    renderStoryImage({
      summary,
      stats: summaryStats(summary, t.timeline.summary, language === "pt" ? "pt-BR" : "en"),
      typeLabel: t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType,
      highlightsTitle: t.timeline.summary.highlights,
      footer: t.timeline.story.footer,
      authorName: displayName || user?.email || "",
      photoUrl: photoUrl ?? undefined,
      format,
    })
      .then((blob) => {
        if (cancelled) return;
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { url: URL.createObjectURL(blob), blob };
        });
      })
      .catch(() => {})
      .finally(() => !cancelled && setRendering(false));
    return () => {
      cancelled = true;
    };
  }, [open, summary, photoUrl, format, t, language, displayName, user]);

  const handleImage = async () => {
    if (!preview) return;
    setGenerating(true);
    try {
      const result = await shareOrDownloadImage(preview.blob, `ez-${format}.png`, summary.workoutName);
      if (result === "downloaded") toast({ title: t.timeline.post.storySaved });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.storyError, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader>
          <DrawerTitle>{ts.title}</DrawerTitle>
          <DrawerDescription>{ts.description}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6 space-y-4">
          <div className="-mx-4">
            <WorkoutSummaryCard summary={summary} />
          </div>

          {/* Post on the app feed */}
          <button
            onClick={onPostToFeed}
            className="flex items-center gap-3 w-full p-4 rounded-2xl border bg-card hover:bg-muted transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{alreadyPosted ? ts.postAgain : ts.postToFeed}</p>
              <p className="text-xs text-muted-foreground">
                {alreadyPosted ? ts.alreadyPosted : ts.postToFeedHint}
              </p>
            </div>
            {alreadyPosted && <Check className="h-4 w-4 text-green-500 shrink-0" />}
          </button>

          {/* Image for Instagram, WhatsApp, Strava… */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white flex items-center justify-center shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{ts.createImage}</p>
                <p className="text-xs text-muted-foreground">{ts.createImageHint}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t.timeline.create.format}</span>
              <div className="flex rounded-full bg-muted p-1">
                {(["story", "post"] as ShareImageFormat[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFormat(value)}
                    className={cn(
                      "px-3 h-8 rounded-full text-xs font-semibold transition-colors",
                      format === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {value === "story" ? ts.formatStory : ts.formatPost}
                  </button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-muted shadow-lg",
                  format === "story" ? "h-72 aspect-[9/16]" : "h-64 aspect-[4/5]"
                )}
              >
                {preview && <img src={preview.url} alt="" className="h-full w-full object-cover" />}
                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {photoUrl && (
                  <button
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label={t.timeline.create.removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Photo behind the stats */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="h-11 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted"
              >
                <Camera className="h-4 w-4 text-primary" />
                {t.timeline.create.camera}
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="h-11 rounded-full border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted"
              >
                <ImagePlus className="h-4 w-4 text-primary" />
                {photoUrl ? ts.changePhoto : t.timeline.create.gallery}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center -mt-1">{photoUrl ? ts.photoAdded : ts.photoHint}</p>

            <button
              onClick={handleImage}
              disabled={generating || !preview}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {ts.shareImage}
            </button>
          </div>
        </div>

        {[galleryRef, cameraRef].map((ref, i) => (
          <input
            key={i}
            ref={ref}
            type="file"
            accept="image/*"
            {...(ref === cameraRef ? { capture: "environment" as const } : {})}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhotoUrl(URL.createObjectURL(file));
              e.target.value = "";
            }}
          />
        ))}
      </DrawerContent>
    </Drawer>
  );
};

export default ShareWorkoutSheet;
