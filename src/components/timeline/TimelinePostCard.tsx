import { useEffect, useRef, useState, useCallback } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { AnimatePresence, motion } from "motion/react";
import { Flame, Instagram, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { renderStoryImage, shareOrDownloadImage } from "@/lib/postImages";
import { summaryStats } from "@/utils/workoutSummaryStats";
import type { WorkoutType } from "@/types/workout";
import { CachedAvatar, CachedImage } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { toggleLike, deleteTimelinePost, updateTimelinePost, createActivityNotification } from "@/services/timelineService";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";
import { CreatePostModal } from "./CreatePostModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CommentsDrawer } from "./CommentsDrawer";
import type { ComposerResult, PostMention, TimelinePost } from "@/types/timeline";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimelinePostCardProps {
  post: TimelinePost;
  onDeleted: (postId: string) => void;
}

export function TimelinePostCard({ post, onDeleted }: TimelinePostCardProps) {
  const { user, isAdmin, displayName } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  // Source of truth comes from the real-time subscription via `post` prop.
  // pendingLike: null = no in-flight, true/false = optimistic override while request is running
  const [pendingLike, setPendingLike] = useState<boolean | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);

  const isLiked = user ? post.likedBy.includes(user.uid) : false;
  const liked = pendingLike ?? isLiked;
  const likesCount = post.likedBy.length + (pendingLike !== null && pendingLike !== isLiked ? (pendingLike ? 1 : -1) : 0);
  const commentsCount = post.commentsCount;

  const isOwn = user?.uid === post.authorId;
  const canDelete = isOwn || isAdmin;

  const handleLike = useCallback(async () => {
    if (!user || pendingLike !== null) return;
    const wasLiked = isLiked;
    setPendingLike(!wasLiked);
    try {
      await toggleLike(post.id, user.uid, wasLiked);
      if (!wasLiked && post.authorId !== user.uid) {
        const actorName = displayName || user.email || "Someone";
        createActivityNotification(post.authorId, actorName, post.id, "like").catch((err) => console.error("[FeedBadge] like notification failed:", err));
      }
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.likeError, variant: "destructive" });
    } finally {
      setPendingLike(null);
    }
  }, [user, pendingLike, isLiked, post.id, toast]);

  // Double tap on the media (detected in PostMedia): like — never unlike —
  // and always show the burst, like Instagram
  const handleDoubleTap = () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 700);
    if (!liked) handleLike();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTimelinePost(post.id);
      onDeleted(post.id);
      toast({ title: t.timeline.post.deleted });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.deleteError, variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // 1080×1920 image for Instagram Stories (native share sheet on phones)
  const handleShareStory = async () => {
    if (!post.workoutSummary) return;
    setSharingStory(true);
    try {
      const summary = post.workoutSummary;
      const blob = await renderStoryImage({
        summary,
        stats: summaryStats(summary, t.timeline.summary, language === "pt" ? "pt-BR" : "en"),
        typeLabel: t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType,
        highlightsTitle: t.timeline.summary.highlights,
        footer: t.timeline.story.footer,
        authorName: post.authorName,
        photoUrl: post.imageUrls[0],
      });
      const result = await shareOrDownloadImage(blob, "ez-treino.png", summary.workoutName);
      if (result === "downloaded") toast({ title: t.timeline.post.storySaved });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.storyError, variant: "destructive" });
    } finally {
      setSharingStory(false);
    }
  };

  const handleEditSubmit = async ({ caption, imageUrls, mentions }: ComposerResult) => {
    try {
      await updateTimelinePost(post.id, { caption, imageUrls, mentions });
      toast({ title: t.timeline.post.edited });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.editError, variant: "destructive" });
      throw new Error("update failed");
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <>
      <article>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-3">
            <CachedAvatar
              src={post.authorPhotoURL}
              alt={post.authorName}
              fallback={getInitials(post.authorName)}
              className="h-8 w-8 ring-2 ring-[#e1b506]"
              fallbackClassName="bg-primary text-primary-foreground text-sm font-semibold"
            />
            <p className="text-sm font-semibold">{post.authorName}</p>
          </div>

          {canDelete && (
            <ActionMenu
              title={t.timeline.post.actionsTitle}
              items={[
                {
                  icon: Instagram,
                  label: t.timeline.post.shareStory,
                  hint: t.timeline.post.shareStoryHint,
                  loading: sharingStory,
                  hidden: !(isOwn && post.workoutSummary),
                  onClick: handleShareStory,
                },
                { icon: Pencil, label: t.timeline.post.edit, hidden: !isOwn, onClick: () => setShowEdit(true) },
                { icon: Trash2, label: t.timeline.post.delete, destructive: true, onClick: () => setConfirmDelete(true) },
              ]}
            >
              <button
                className="h-9 w-9 -mr-1 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                aria-label={t.timeline.post.actionsTitle}
              >
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </ActionMenu>
          )}
        </div>

        {/* Media: workout summary card and/or image, swipeable when both */}
        <PostMedia
          post={post}
          onDoubleTap={handleDoubleTap}
          showHeartBurst={showHeartBurst}
        />

        {/* Actions */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={pendingLike !== null}
            className={cn(
              "flex items-center gap-1.5 transition-transform active:scale-110",
              liked ? "text-red-500" : "text-foreground hover:text-muted-foreground"
            )}
          >
            <Flame className={cn("h-6 w-6", liked && "fill-current text-orange-500")} />
            {likesCount > 0 && <span className="text-sm font-semibold text-foreground">{likesCount}</span>}
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
            {commentsCount > 0 && <span className="text-sm font-semibold">{commentsCount}</span>}
          </button>
        </div>

        {/* Caption */}
        {post.caption && !post.captionIsSummary && (
          <PostCaption
            authorName={post.authorName}
            caption={post.caption}
            mentions={post.mentions}
            labels={{ more: t.timeline.post.seeMore, less: t.timeline.post.seeLess }}
          />
        )}

        {/* Timestamp */}
        <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
          {formatDistanceToNow(post.createdAt, { addSuffix: true, ...(language === "pt" ? { locale: ptBR } : {}) })}
        </p>
      </article>

      <CommentsDrawer
        open={showComments}
        onOpenChange={setShowComments}
        postId={post.id}
        postAuthorId={post.authorId}
        onCommentsCountChange={() => {}}
      />


      <ResponsiveConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t.timeline.post.delete}
        description={t.timeline.post.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />

      <CreatePostModal
        open={showEdit}
        onOpenChange={setShowEdit}
        onSubmit={handleEditSubmit}
        initialCaption={post.caption}
        initialImageUrls={post.imageUrls}
        initialMentions={post.mentions}
        workoutSummary={post.workoutSummary}
        title={t.timeline.post.editTitle}
        submitLabel={t.timeline.post.editSubmit}
      />
    </>
  );
}

interface PostMediaProps {
  post: TimelinePost;
  onDoubleTap: () => void;
  showHeartBurst: boolean;
}

function PostMedia({ post, onDoubleTap, showHeartBurst }: PostMediaProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  type Slide = { kind: "summary" } | { kind: "image"; url: string };
  const slides: Slide[] = [];
  if (post.workoutSummary) slides.push({ kind: "summary" });
  post.imageUrls.forEach((url) => slides.push({ kind: "image", url }));

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (slides.length === 0) return null;

  // Double tap anywhere on the media likes the post. Uses pointerup instead of
  // two clicks: iOS swallows the second click of a double tap (zoom gesture).
  const handlePointerUp = (e: React.PointerEvent) => {
    const now = Date.now();
    const prev = lastTap.current;
    const near = prev && Math.abs(e.clientX - prev.x) < 30 && Math.abs(e.clientY - prev.y) < 30;
    if (prev && near && now - prev.time < 320) {
      lastTap.current = null;
      onDoubleTap();
    } else {
      lastTap.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const renderSlide = (s: Slide) =>
    s.kind === "summary" && post.workoutSummary ? (
      <WorkoutSummaryCard summary={post.workoutSummary} flush />
    ) : s.kind === "image" ? (
      <div className="w-full bg-muted">
        <PostImage url={s.url} />
      </div>
    ) : null;

  return (
    <div>
      <div
        className="relative overflow-hidden select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
        onPointerUp={handlePointerUp}
      >
        {slides.length === 1 ? (
          <div className="w-full">{renderSlide(slides[0])}</div>
        ) : (
          <Carousel setApi={setApi} opts={{ loop: false }} className="w-full">
            <CarouselContent className="ml-0">
              {slides.map((s, i) => (
                <CarouselItem key={i} className="pl-0 basis-full flex">
                  {renderSlide(s)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}

        {count > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 rounded-full transition-all", current === i ? "bg-white w-3" : "bg-white/60 w-1.5")}
              />
            ))}
          </div>
        )}

        {/* Like burst */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              key="burst"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.25, 1], opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Flame className="h-24 w-24 text-orange-400 fill-orange-400 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Fills the card at the photo's own shape, clamped between 4:5 and 1.91:1 like
// Instagram, so there are no grey bars around portrait or landscape shots.
function PostImage({ url }: { url: string }) {
  const [ratio, setRatio] = useState(4 / 5);
  return (
    <div className="w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      <CachedImage
        src={url}
        alt="Post"
        className="w-full h-full object-cover"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setRatio(Math.min(1.91, Math.max(0.8, img.naturalWidth / img.naturalHeight)));
          }
        }}
      />
    </div>
  );
}

const CAPTION_PREVIEW = 140;

/** Caption with tappable-looking @mentions and a "more" toggle for long text. */
function PostCaption({
  authorName,
  caption,
  mentions,
  labels,
}: {
  authorName: string;
  caption: string;
  mentions: PostMention[];
  labels: { more: string; less: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = caption.length > CAPTION_PREVIEW;
  const text = expanded || !isLong ? caption : `${caption.slice(0, CAPTION_PREVIEW).trimEnd()}…`;

  // Split on known @names (longest first so "Ana Beatriz" wins over "Ana")
  const names = [...mentions.map((m) => m.name)].sort((a, b) => b.length - a.length);
  const parts: { text: string; mention: boolean }[] = [];
  if (names.length) {
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(@(?:${escaped.join("|")}))`, "g");
    text.split(re).forEach((chunk) => {
      if (chunk) parts.push({ text: chunk, mention: re.test(chunk) && chunk.startsWith("@") });
      re.lastIndex = 0;
    });
  } else {
    parts.push({ text, mention: false });
  }

  return (
    <p className="px-3 pt-1 text-sm whitespace-pre-line break-words">
      <span className="font-semibold mr-1">{authorName}</span>
      {parts.map((part, i) =>
        part.mention ? (
          <span key={i} className="font-semibold text-primary">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
      {isLong && (
        <button onClick={() => setExpanded((v) => !v)} className="ml-1 text-muted-foreground font-medium">
          {expanded ? labels.less : labels.more}
        </button>
      )}
    </p>
  );
}
