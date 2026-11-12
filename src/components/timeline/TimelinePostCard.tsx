import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { AnimatePresence, motion } from "motion/react";
import { Flame, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { summaryStats, workoutCardModel } from "@/utils/workoutSummaryStats";
import type { WorkoutType } from "@/types/workout";
import { CachedAvatar, CachedImage } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { toggleLike, deleteTimelinePost, updateTimelinePost, createActivityNotification } from "@/services/timelineService";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";
import { CreatePostModal } from "./CreatePostModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CommentsDrawer } from "./CommentsDrawer";
import ShareWorkoutSheet from "@/components/athlete/ShareWorkoutSheet";
import { haptics } from "@/lib/haptics";
import type { ComposerResult, PostMention, TimelinePost } from "@/types/timeline";
import { useLanguage } from "@/contexts/LanguageContext";
import { fullDateTime } from "./relativeTime";
import { formatDate } from "@/lib/dates";
import { SPORT_BG, sportKey } from "./sport";
import { sendFeedPush } from "@/services/feedPush";

/**
 * Feed previews written by the backend (backend/feed-preview): who liked it
 * and the latest comments. Read only when present, so older posts and the
 * current backend keep working.
 */
interface FeedPreview {
  likedPreview?: { id: string; name: string }[];
  lastComments?: { id: string; authorId: string; authorName: string; text: string; createdAt: Date }[];
}

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
  const [showShare, setShowShare] = useState(false);

  const isLiked = user ? post.likedBy.includes(user.uid) : false;
  const liked = pendingLike ?? isLiked;
  const likesCount = post.likedBy.length + (pendingLike !== null && pendingLike !== isLiked ? (pendingLike ? 1 : -1) : 0);
  const commentsCount = post.commentsCount;

  const isOwn = user?.uid === post.authorId;
  const canDelete = isOwn || isAdmin;

  const handleLike = useCallback(async () => {
    if (!user || pendingLike !== null) return;
    const wasLiked = isLiked;
    if (!wasLiked) haptics.tap();
    setPendingLike(!wasLiked);
    try {
      await toggleLike(post.id, user.uid, wasLiked);
      if (!wasLiked && post.authorId !== user.uid) {
        const actorName = displayName || user.email || "Someone";
        createActivityNotification(post.authorId, actorName, post.id, "like", user.uid).catch((err) => console.error("[FeedBadge] like notification failed:", err));
        sendFeedPush({ postId: post.id, kind: "like" });
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

  // Share: only your own activities, as the activity image (share sheet)
  const canShare = isOwn && !!post.workoutSummary;
  const handleShare = () => setShowShare(true);

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

  const isCoachPost = post.authorRole === "admin";
  const summary = post.workoutSummary;
  const sport = summary ? sportKey(summary.workoutType) : null;
  const hasMedia = !!summary || post.imageUrls.length > 0;
  // The automatic "Workout complete" caption only repeats the workout card: hide it
  const showCaption = !!post.caption && !post.captionIsSummary && !(post.captionAuto && summary);
  const kindLabel = summary
    ? t.workoutMeta.types[summary.workoutType as WorkoutType] ?? summary.workoutType
    : isCoachPost
    ? t.timeline.post.notice
    : null;

  const caption = showCaption ? (
    <PostCaption
      authorName={post.authorName}
      caption={post.captionAuto ? t.timeline.post.autoCaption : post.caption}
      mentions={post.captionAuto ? [] : post.mentions}
      labels={{ more: t.timeline.post.seeMore, less: t.timeline.post.seeLess }}
      textOnly={!hasMedia}
    />
  ) : null;

  return (
    <>
      {/* Each post is its own card on the feed canvas (design: docs/design/feed) */}
      <article
        className={cn(
          "overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm dark:shadow-none",
          isCoachPost && "border-primary/45"
        )}
      >
        {/* Header: avatar, name (+ Coach), "sport · time ago", menu */}
        <div className="flex items-center gap-2.5 py-3 pl-3.5 pr-1">
          <CachedAvatar
            src={post.authorPhotoURL}
            alt=""
            fallback={getInitials(post.authorName)}
            className={cn("h-10 w-10 shrink-0", isCoachPost && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
            fallbackClassName={cn(
              "text-[15px] font-bold",
              isCoachPost ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-title-sm leading-tight">
              <span className="truncate">{post.authorName}</span>
              {isCoachPost && (
                <span className="shrink-0 rounded-sm bg-primary px-1.5 py-0.5 text-overline leading-none text-primary-foreground">
                  {t.timeline.post.coachBadge}
                </span>
              )}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground">
              {sport && <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SPORT_BG[sport])} />}
              {kindLabel && <span>{kindLabel}</span>}
              {kindLabel && <span aria-hidden>·</span>}
              <time dateTime={post.createdAt.toISOString()} title={fullDateTime(post.createdAt, language)}>
                {formatDate(post.createdAt, "relativeLong", language)}
              </time>
            </p>
          </div>

          {canDelete && (
            <ActionMenu
              title={t.timeline.post.actionsTitle}
              items={[
                { icon: Pencil, label: t.timeline.post.edit, hidden: !isOwn, onClick: () => setShowEdit(true) },
                { icon: Trash2, label: t.timeline.post.delete, destructive: true, onClick: () => setConfirmDelete(true) },
              ]}
            >
              <button
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                aria-label={t.timeline.post.actionsTitle}
              >
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </ActionMenu>
          )}
        </div>

        {/* Text-only post: the text comes first, then the actions */}
        {!hasMedia && caption}

        {/* Media: workout summary card and/or image, swipeable when both */}
        <PostMedia
          post={post}
          onDoubleTap={handleDoubleTap}
          showHeartBurst={showHeartBurst}
        />

        {/* Actions */}
        {/* 44px hit areas */}
        <div className="flex items-center px-1.5 pt-1.5 pb-1">
          <button
            onClick={handleLike}
            disabled={pendingLike !== null}
            aria-pressed={liked}
            aria-label={(liked ? t.timeline.post.unlike : t.timeline.post.like).replace("{{n}}", String(likesCount))}
            className={cn(
              "min-h-11 min-w-11 px-2 flex items-center gap-1.5 transition-transform active:scale-110",
              "text-foreground hover:text-muted-foreground"
            )}
          >
            {/* The flame is EZ's "like": a short spring pop when it lights up */}
            <motion.span
              key={liked ? "on" : "off"}
              initial={false}
              animate={liked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 32, duration: 0.28 }}
              className="inline-flex"
            >
              <Flame className={cn("h-6 w-6", liked && "fill-sport-strength text-sport-strength")} aria-hidden />
            </motion.span>
            {likesCount > 0 && <span className="text-sm font-semibold text-foreground" aria-hidden>{likesCount}</span>}
          </button>
          <button
            onClick={() => setShowComments(true)}
            aria-label={t.timeline.post.comments.replace("{{n}}", String(commentsCount))}
            className="min-h-11 min-w-11 px-2 flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
          >
            <MessageCircle className="h-6 w-6" aria-hidden />
            {commentsCount > 0 && <span className="text-sm font-semibold" aria-hidden>{commentsCount}</span>}
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              aria-label={t.timeline.post.share}
              className="ml-auto min-h-11 min-w-11 px-2 flex items-center justify-center text-foreground hover:text-muted-foreground transition-colors"
            >
              <Share2 className="h-6 w-6" aria-hidden />
            </button>
          )}
        </div>

        {/* Who liked it (names from the backend preview, when available) */}
        <LikedBy
          likedBy={post.likedBy}
          preview={(post as TimelinePost & FeedPreview).likedPreview}
          me={user && liked ? { id: user.uid, name: displayName || t.timeline.post.you } : null}
          total={likesCount}
        />

        {/* Caption below the actions when there is media */}
        {hasMedia && caption}

        {/* Latest comments + link to all of them */}
        <CommentsPreview
          comments={(post as TimelinePost & FeedPreview).lastComments}
          count={commentsCount}
          onOpen={() => setShowComments(true)}
          coachReply={isAdmin && !isOwn}
        />
        <div className="h-3" aria-hidden />
      </article>

      {isOwn && post.workoutSummary && (
        <ShareWorkoutSheet
          open={showShare}
          onOpenChange={setShowShare}
          summary={post.workoutSummary}
          initialPhotoUrl={post.imageUrls?.[0]}
        />
      )}

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

const clampRatio = (r: number) => Math.min(1.91, Math.max(0.8, r));

/**
 * Photos keep their own shape within 4:5 (portrait) and 1.91:1 (landscape).
 * In a carousel every slide shares the first photo's ratio so the post never
 * jumps while swiping. With a workout card as the last slide the box is at
 * most 5:4 (landscape), the shortest box where the card still fits.
 * The workout card is the last slide; the first photo carries its 3 numbers.
 */
function PostMedia({ post, onDoubleTap, showHeartBurst }: PostMediaProps) {
  const { t, language } = useLanguage();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [firstRatio, setFirstRatio] = useState(4 / 5);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  const summary = post.workoutSummary;
  const images = post.imageUrls;
  const slideCount = images.length + (summary && images.length ? 1 : 0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

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

  const burst = (
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
          <Flame className="h-24 w-24 fill-sport-strength text-sport-strength drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const wrap = (children: React.ReactNode, className?: string) => (
    <div
      className={cn("relative select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]", className)}
      onPointerUp={handlePointerUp}
    >
      {children}
      {burst}
    </div>
  );

  // Workout without photos: the card inline, at its own height
  if (!images.length) {
    return summary ? wrap(<WorkoutSummaryCard summary={summary} variant="inline" />) : null;
  }

  const ratio = summary ? Math.min(clampRatio(firstRatio), 1.25) : clampRatio(firstRatio);
  const card = summary ? workoutCardModel(summary, t.timeline.summary, language === "pt" ? "pt-BR" : "en") : null;
  const overlay = card ? [card.hero, ...card.secondary].filter(Boolean).slice(0, 3) : [];

  const photo = (url: string, i: number) => (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <CachedImage
        src={url}
        alt={t.timeline.post.imageAlt}
        className="h-full w-full object-cover"
        onLoad={
          i === 0
            ? (e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) setFirstRatio(img.naturalWidth / img.naturalHeight);
              }
            : undefined
        }
      />
      {/* The workout's numbers on the first photo, on a dark glass that reads on any photo */}
      {i === 0 && overlay.length > 0 && (
        <div className="absolute inset-x-3 bottom-3 flex items-end gap-4 rounded-2xl border border-white/20 bg-black/50 px-3.5 py-2.5 text-white backdrop-blur-md">
          {overlay.map((m) => (
            <div key={m!.key} className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75">{m!.label}</p>
              <p className="whitespace-nowrap font-display text-xl font-bold tabular-nums leading-tight">
                {m!.value}
                {m!.unit && <span className="ml-0.5 text-xs font-semibold text-white/75">{m!.unit}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const slides: React.ReactNode[] = images.map((url, i) => photo(url, i));
  if (summary) slides.push(<WorkoutSummaryCard summary={summary} variant="poster" compact={ratio > 1} />);

  return (
    <div>
      {wrap(
        <div className="w-full overflow-hidden" style={{ aspectRatio: ratio }}>
          {slides.length === 1 ? (
            slides[0]
          ) : (
            <Carousel setApi={setApi} opts={{ loop: false }} className="h-full w-full [&>div]:h-full">
              <CarouselContent className="ml-0 h-full">
                {slides.map((s, i) => (
                  <CarouselItem key={i} className="h-full basis-full pl-0">
                    {s}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
          {slideCount > 1 && (
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white">
              {current + 1}/{slideCount}
            </span>
          )}
        </div>
      )}
      {slideCount > 1 && (
        <div className="flex justify-center gap-1.5 pt-2.5" aria-hidden>
          {Array.from({ length: slideCount }).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 rounded-full transition-all duration-fast", current === i ? "w-4 bg-primary" : "w-1.5 bg-border")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Caption with highlighted @mentions, clamped to 3 lines with a "more" toggle. */
function PostCaption({
  authorName,
  caption,
  mentions,
  labels,
  textOnly = false,
}: {
  authorName: string;
  caption: string;
  mentions: PostMention[];
  labels: { more: string; less: string };
  /** Post without media: bigger text, no author prefix (the header already has it) */
  textOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Show "more" only when the text really overflows the 3 lines
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [caption, expanded]);

  // Split on known @names (longest first so "Ana Beatriz" wins over "Ana")
  const names = [...mentions.map((m) => m.name)].sort((a, b) => b.length - a.length);
  const parts: { text: string; mention: boolean }[] = [];
  if (names.length) {
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`(@(?:${escaped.join("|")}))`, "g");
    caption.split(re).forEach((chunk) => {
      if (chunk) parts.push({ text: chunk, mention: re.test(chunk) && chunk.startsWith("@") });
      re.lastIndex = 0;
    });
  } else {
    parts.push({ text: caption, mention: false });
  }

  return (
    <div className={textOnly ? "px-4 pb-1" : "px-4 pt-1"}>
      <p
        ref={ref}
        className={cn(
          "whitespace-pre-line break-words",
          textOnly ? "text-body" : "text-body-sm",
          !expanded && "line-clamp-3"
        )}
      >
        {!textOnly && <span className="font-semibold mr-1">{authorName}</span>}
        {parts.map((part, i) =>
          part.mention ? (
            <span key={i} className="font-semibold text-primary-ink">
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="min-h-8 text-body-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? labels.less : labels.more}
        </button>
      )}
    </div>
  );
}

function LikedBy({
  likedBy,
  preview,
  me,
  total,
}: {
  likedBy: string[];
  preview?: { id: string; name: string }[];
  me: { id: string; name: string } | null;
  total: number;
}) {
  const { t } = useLanguage();
  // Only names still in likedBy (guards against a stale preview); my own like first
  let people = (preview ?? []).filter((p) => likedBy.includes(p.id));
  if (me) people = [me, ...people.filter((p) => p.id !== me.id)];
  else people = people.filter((p) => likedBy.includes(p.id));
  if (!people.length || total <= 0) return null;

  const first = people[0].name;
  const others = total - 1;
  const text =
    others <= 0
      ? t.timeline.post.likedByOne
      : others === 1 && people[1]
      ? t.timeline.post.likedByTwo.replace("{{second}}", people[1].name)
      : others === 1
      ? t.timeline.post.likedByOther
      : t.timeline.post.likedByMany.replace("{{n}}", String(others));

  return (
    <div className="flex items-center gap-2 px-4 pb-1 text-body-sm">
      <span className="flex shrink-0" aria-hidden>
        {people.slice(0, 3).map((p, i) => (
          <span
            key={p.id}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full border bg-muted text-[11px] font-bold ring-2 ring-card",
              i > 0 && "-ml-1.5"
            )}
          >
            {p.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </span>
      <p className="min-w-0">
        {t.timeline.post.likedByPrefix} <span className="font-semibold">{first}</span> {text}
      </p>
    </div>
  );
}

function CommentsPreview({
  comments,
  count,
  onOpen,
  coachReply,
}: {
  comments?: { id: string; authorName: string; text: string }[];
  count: number;
  onOpen: () => void;
  /** Coach on someone else's post: a quick "reply as coach" entry */
  coachReply: boolean;
}) {
  const { t } = useLanguage();
  // The backend keeps the newest first; read them in order of time
  const shown = (comments ?? []).slice(0, 2).reverse();
  return (
    <div className="grid gap-1 px-4 pt-1.5 text-body-sm">
      {shown.map((c) => (
        <button key={c.id} onClick={onOpen} className="line-clamp-2 text-left">
          <span className="mr-1 font-semibold">{c.authorName}</span>
          {c.text}
        </button>
      ))}
      {count > shown.length && (
        <button onClick={onOpen} className="min-h-8 text-left text-muted-foreground hover:text-foreground">
          {count === 1 ? t.timeline.post.seeOneComment : t.timeline.post.seeAllComments.replace("{{n}}", String(count))}
        </button>
      )}
      {count === 0 && !coachReply && (
        <button onClick={onOpen} className="min-h-8 text-left text-muted-foreground hover:text-foreground">
          {t.timeline.post.firstComment}
        </button>
      )}
      {coachReply && (
        <button
          onClick={onOpen}
          className="mt-1 min-h-10 rounded-full border bg-muted/50 px-3.5 text-left text-muted-foreground hover:text-foreground"
        >
          {t.timeline.post.replyAsCoach}
        </button>
      )}
    </div>
  );
}
