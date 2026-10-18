import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, Camera, ImagePlus, Images, Loader2, X } from "lucide-react";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { Switch } from "@/components/ui/switch";
import { getAllUsers } from "@/services/usersService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/types/user";
import type { ComposerResult, PostMention, WorkoutSummary } from "@/types/timeline";
import type { WorkoutType } from "@/types/workout";
import { renderPostImage, uploadPostImage, type PostAspect } from "@/lib/postImages";
import { summaryStats } from "@/utils/workoutSummaryStats";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (result: ComposerResult) => Promise<void>;
  initialCaption?: string;
  /** Already-uploaded photos (editing a post) */
  initialImageUrls?: string[];
  initialMentions?: PostMention[];
  workoutSummary?: WorkoutSummary;
  title?: string;
  submitLabel?: string;
}

const MAX_PHOTOS = 4;
const DRAFT_KEY = "timeline-post-draft";

type Photo =
  | { kind: "remote"; id: string; url: string }
  | { kind: "local"; id: string; sourceUrl: string; previewUrl: string };

const newId = () => Math.random().toString(36).slice(2, 10);

/** "@ana" right before the caret → the query being typed, else null */
const mentionQueryAt = (text: string, caret: number) => {
  const before = text.slice(0, caret);
  const match = before.match(/(?:^|\s)@([^\s@]{0,30})$/);
  return match ? { query: match[1], start: caret - match[1].length - 1 } : null;
};

export function CreatePostModal({
  open,
  onOpenChange,
  onSubmit,
  initialCaption,
  initialImageUrls,
  initialMentions,
  workoutSummary,
  title,
  submitLabel,
}: CreatePostModalProps) {
  const { user, displayName, photoURL } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const tc = t.timeline.create;
  // Editing or a prefilled workout post — those never use the saved draft
  const isEditing = !!initialImageUrls || initialCaption !== undefined;

  const [caption, setCaption] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [aspect, setAspect] = useState<PostAspect>("4:5");
  const [statsOnPhoto, setStatsOnPhoto] = useState(false);
  const [mentions, setMentions] = useState<PostMention[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Inline @mention autocomplete
  const [users, setUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState<{ query: string; start: number } | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const authorName = displayName || user?.email || "User";
  const localPhotos = photos.filter((p): p is Extract<Photo, { kind: "local" }> => p.kind === "local");

  const overlayContent = useMemo(() => {
    if (!workoutSummary) return undefined;
    return {
      summary: workoutSummary,
      stats: summaryStats(workoutSummary, t.timeline.summary, language === "pt" ? "pt-BR" : "en"),
      typeLabel: t.workoutMeta.types[workoutSummary.workoutType as WorkoutType] ?? workoutSummary.workoutType,
    };
  }, [workoutSummary, t, language]);

  // Reset / restore when opening
  useEffect(() => {
    if (!open) return;
    setPhotos((initialImageUrls ?? []).map((url) => ({ kind: "remote", id: newId(), url })));
    setMentions(initialMentions ?? []);
    setAspect("4:5");
    setStatsOnPhoto(!!workoutSummary);
    setUploadProgress(null);
    let text = initialCaption ?? "";
    // A plain new post picks up where an unsent one left off
    if (!isEditing && !workoutSummary) {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as { caption: string; mentions: PostMention[] } | null;
        if (draft?.caption) {
          text = draft.caption;
          setMentions(draft.mentions ?? []);
          toast({ title: tc.draftRestored });
        }
      } catch {
        // ignore
      }
    }
    setCaption(text);
    setTimeout(() => textareaRef.current?.focus(), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Save the unsent text of a plain new post
  useEffect(() => {
    if (!open || isEditing || workoutSummary) return;
    try {
      if (caption.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ caption, mentions }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }, [open, caption, mentions, isEditing, workoutSummary]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Re-render local previews when the format or the stats overlay changes
  const renderKey = `${aspect}|${statsOnPhoto}|${localPhotos.map((p) => p.id).join(",")}`;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const firstLocalIndex = photos.findIndex((p) => p.kind === "local");
    (async () => {
      const updates = await Promise.all(
        photos.map(async (photo, index) => {
          if (photo.kind !== "local") return photo;
          try {
            const blob = await renderPostImage(photo.sourceUrl, {
              aspect,
              overlay: statsOnPhoto && overlayContent && index === firstLocalIndex ? overlayContent : undefined,
            });
            return { ...photo, previewUrl: URL.createObjectURL(blob) };
          } catch {
            return photo;
          }
        })
      );
      if (!cancelled) setPhotos(updates);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey, open]);

  const loadUsers = async () => {
    if (users.length) return;
    try {
      const all = await getAllUsers();
      setUsers(all.filter((u) => u.id !== user?.uid));
    } catch {
      toast({ title: t.common.error, description: tc.loadUsersError, variant: "destructive" });
    }
  };

  const handleCaptionChange = (value: string, caret: number) => {
    setCaption(value);
    const q = mentionQueryAt(value, caret);
    setMentionQuery(q);
    if (q) loadUsers();
    // Drop tags whose @name was deleted from the text
    setMentions((prev) => prev.filter((m) => value.includes(`@${m.name}`)));
  };

  const insertMention = (u: User) => {
    if (!mentionQuery) return;
    const before = caption.slice(0, mentionQuery.start);
    const after = caption.slice(mentionQuery.start + 1 + mentionQuery.query.length);
    const token = `@${u.displayName} `;
    const next = before + token + after;
    setCaption(next);
    setMentions((prev) => (prev.some((m) => m.id === u.id) ? prev : [...prev, { id: u.id, name: u.displayName }]));
    setMentionQuery(null);
    setTimeout(() => {
      const pos = before.length + token.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 30);
  };

  const startMention = () => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? caption.length;
    const needsSpace = caret > 0 && !/\s/.test(caption[caret - 1]);
    const next = caption.slice(0, caret) + (needsSpace ? " @" : "@") + caption.slice(caret);
    const newCaret = caret + (needsSpace ? 2 : 1);
    handleCaptionChange(next, newCaret);
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(newCaret, newCaret);
    }, 30);
  };

  const removeMention = (m: PostMention) => {
    setMentions((prev) => prev.filter((x) => x.id !== m.id));
    setCaption((prev) => prev.replace(`@${m.name} `, "").replace(`@${m.name}`, ""));
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room)
      .map((file) => {
        const sourceUrl = URL.createObjectURL(file);
        return { kind: "local" as const, id: newId(), sourceUrl, previewUrl: sourceUrl };
      });
    if (picked.length) setPhotos((prev) => [...prev, ...picked]);
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const filteredUsers = mentionQuery
    ? users
        .filter((u) => u.displayName.toLowerCase().includes(mentionQuery.query.toLowerCase()))
        .slice(0, 6)
    : [];

  const handleSubmit = async () => {
    if (!caption.trim() && photos.length === 0 && !workoutSummary) return;
    setSubmitting(true);
    try {
      // Upload the rendered local photos (in order), reporting overall progress
      const totals = localPhotos.length;
      const progressByPhoto = new Map<string, number>();
      const report = () => {
        if (!totals) return;
        const sum = [...progressByPhoto.values()].reduce((a, b) => a + b, 0);
        setUploadProgress(Math.round((sum / totals) * 100));
      };
      if (totals) setUploadProgress(0);
      const imageUrls = await Promise.all(
        photos.map(async (photo) => {
          if (photo.kind === "remote") return photo.url;
          const blob = await (await fetch(photo.previewUrl)).blob();
          return uploadPostImage(blob, (fraction) => {
            progressByPhoto.set(photo.id, fraction);
            report();
          });
        })
      );
      await onSubmit({ caption: caption.trim(), imageUrls, mentions });
      if (!isEditing) localStorage.removeItem(DRAFT_KEY);
      onOpenChange(false);
    } catch {
      toast({ title: t.common.error, description: tc.createError, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const canPost = (caption.trim().length > 0 || photos.length > 0 || !!workoutSummary) && !submitting;
  const hasLocal = localPhotos.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-14 shrink-0">
        <button
          onClick={() => onOpenChange(false)}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
          disabled={submitting}
          aria-label={t.common.close}
        >
          <X className="h-6 w-6" />
        </button>
        <span className="font-bold text-base">{title ?? (workoutSummary ? tc.workoutPost : tc.title)}</span>
        <span className="w-10" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Author + text */}
        <div className="flex gap-3 px-4 pt-2">
          <CachedAvatar
            src={photoURL}
            alt="Profile"
            fallback={authorName.charAt(0).toUpperCase()}
            className="h-11 w-11 shrink-0 ring-2 ring-[#e1b506]"
            fallbackClassName="bg-primary text-primary-foreground font-bold text-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{authorName}</p>
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
              onSelect={(e) => {
                const el = e.currentTarget;
                setMentionQuery(mentionQueryAt(el.value, el.selectionStart ?? el.value.length));
              }}
              placeholder={t.timeline.create.placeholder}
              rows={4}
              className="w-full mt-1 bg-transparent text-[16px] leading-relaxed placeholder:text-muted-foreground resize-none outline-none border-none focus:ring-0"
            />
          </div>
        </div>

        {/* @mention suggestions */}
        <AnimatePresence>
          {mentionQuery && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-4 mb-2 rounded-2xl glass-menu overflow-hidden"
            >
              {users.length === 0 ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">{tc.noUsers}</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertMention(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-foreground/5 text-left"
                  >
                    <CachedAvatar
                      src={u.photoURL}
                      alt={u.displayName}
                      fallback={u.displayName.charAt(0).toUpperCase()}
                      className="h-8 w-8 shrink-0"
                      fallbackClassName="bg-primary text-primary-foreground text-xs font-semibold"
                    />
                    <span className="text-sm font-medium truncate">{u.displayName}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tagged people */}
        {mentions.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-1">{tc.tagged}</span>
            {mentions.map((m) => (
              <span key={m.id} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-2.5 pr-1 h-7 text-xs font-medium">
                @{m.name}
                <button onClick={() => removeMention(m)} className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-primary/15">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "relative shrink-0 snap-start overflow-hidden rounded-2xl bg-muted",
                    photos.length === 1 ? "w-full" : "w-[72%]",
                    aspect === "1:1" ? "aspect-square" : aspect === "4:5" ? "aspect-[4/5]" : "aspect-[4/5]"
                  )}
                >
                  <img
                    src={photo.kind === "remote" ? photo.url : photo.previewUrl}
                    alt=""
                    className={cn("w-full h-full", aspect === "original" && photo.kind === "local" ? "object-contain" : "object-cover")}
                  />
                  {photos.length > 1 && (
                    <span className="absolute top-2 left-2 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2 py-0.5">
                      {index + 1}/{photos.length}
                    </span>
                  )}
                  {!submitting && (
                    <button
                      onClick={() => removePhoto(photo.id)}
                      aria-label={tc.removePhoto}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className={cn(
                    "shrink-0 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground",
                    "w-28 aspect-[4/5]"
                  )}
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-[11px]">{photos.length}/{MAX_PHOTOS}</span>
                </button>
              )}
            </div>

            {/* Format + stats overlay (only for new photos) */}
            {hasLocal && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{tc.format}</span>
                  <div className="flex rounded-full bg-muted p-1">
                    {(["4:5", "1:1", "original"] as PostAspect[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => setAspect(value)}
                        className={cn(
                          "px-3 h-8 rounded-full text-xs font-semibold transition-colors",
                          aspect === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        {value === "original" ? tc.formatOriginal : value}
                      </button>
                    ))}
                  </div>
                </div>
                {overlayContent && (
                  <label className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{tc.overlay}</span>
                      <span className="block text-xs text-muted-foreground">{tc.overlayHint}</span>
                    </span>
                    <Switch checked={statsOnPhoto} onCheckedChange={setStatsOnPhoto} />
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Workout card */}
        {workoutSummary && <WorkoutSummaryCard summary={workoutSummary} />}
      </div>

      {/* Bottom bar: photo actions + big publish button near the thumb */}
      <div className="shrink-0 border-t border-border/60 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 bg-background">
        <div className="flex items-center gap-1">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS || submitting}
            className="flex items-center gap-2 h-10 px-3 rounded-full text-sm font-medium hover:bg-accent disabled:opacity-40"
          >
            <Camera className="h-5 w-5 text-primary" />
            {tc.camera}
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS || submitting}
            className="flex items-center gap-2 h-10 px-3 rounded-full text-sm font-medium hover:bg-accent disabled:opacity-40"
          >
            <Images className="h-5 w-5 text-primary" />
            {tc.gallery}
          </button>
          <button
            onClick={startMention}
            disabled={submitting}
            className="flex items-center gap-2 h-10 px-3 rounded-full text-sm font-medium hover:bg-accent disabled:opacity-40"
            aria-label={tc.mentionHint}
          >
            <AtSign className="h-5 w-5 text-primary" />
            {tc.people}
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canPost}
          className="relative w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold overflow-hidden disabled:opacity-50 transition-opacity"
        >
          {uploadProgress !== null && (
            <span
              className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploadProgress !== null
              ? tc.uploading.replace("{{p}}", String(uploadProgress))
              : (submitLabel ?? tc.post)}
          </span>
        </button>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
