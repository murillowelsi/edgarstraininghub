import { useEffect, useRef, useState, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CachedAvatar, CachedImage } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { toggleLike, deleteTimelinePost, updateTimelinePost, createActivityNotification } from "@/services/timelineService";
import { WorkoutSummaryCard } from "./WorkoutSummaryCard";
import { CreatePostModal } from "./CreatePostModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CommentsDrawer } from "./CommentsDrawer";
import type { TimelinePost } from "@/types/timeline";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
  const [showActions, setShowActions] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const isLiked = user ? post.likedBy.includes(user.uid) : false;
  const liked = pendingLike ?? isLiked;
  const likesCount = post.likedBy.length + (pendingLike !== null && pendingLike !== isLiked ? (pendingLike ? 1 : -1) : 0);
  const commentsCount = post.commentsCount;
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);

  const canDelete = user?.uid === post.authorId || isAdmin;

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

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      if (!liked) {
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 800);
        handleLike();
      }
    }
    lastTapRef.current = now;
  };

  const handleDelete = async () => {
    setShowActions(false);
    try {
      await deleteTimelinePost(post.id);
      onDeleted(post.id);
      toast({ title: t.timeline.post.deleted });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.deleteError, variant: "destructive" });
    }
  };

  const handleEditSubmit = async (caption: string, imageUrl?: string) => {
    try {
      await updateTimelinePost(post.id, { caption, imageUrl });
      toast({ title: t.timeline.post.edited });
    } catch {
      toast({ title: t.common.error, description: t.timeline.post.editError, variant: "destructive" });
      throw new Error("update failed");
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <>
      <article className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
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
            <button
              className="p-1 rounded-full hover:bg-accent transition-colors"
              onClick={() => setShowActions(true)}
            >
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Media: workout summary card and/or image, swipeable when both */}
        <PostMedia
          post={post}
          onDoubleTap={handleDoubleTap}
          showHeartBurst={showHeartBurst}
        />

        {/* Actions */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={pendingLike !== null}
            className={cn(
              "flex items-center gap-1.5 transition-transform active:scale-110",
              liked ? "text-red-500" : "text-foreground hover:text-muted-foreground"
            )}
          >
            <Heart className={cn("h-6 w-6", liked && "fill-current")} />
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
        {post.caption && (
          <p className="px-4 pt-1 text-sm">
            <span className="font-semibold mr-1">{post.authorName}</span>
            {post.caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="px-4 pt-1 pb-3 text-xs text-muted-foreground uppercase tracking-wide">
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

      <Drawer open={showActions} onOpenChange={setShowActions}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.timeline.post.actionsTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
              onClick={() => { setShowActions(false); setShowEdit(true); }}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t.timeline.post.edit}</p>
              </div>
            </button>
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl border bg-card hover:bg-muted transition-colors text-left"
              onClick={handleDelete}
            >
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-destructive">{t.timeline.post.delete}</p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <CreatePostModal
        open={showEdit}
        onOpenChange={setShowEdit}
        onSubmit={handleEditSubmit}
        initialCaption={post.caption}
        initialImageUrl={post.imageUrl}
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

  type Slide = { kind: "summary" } | { kind: "image"; url: string };
  const slides: Slide[] = [];
  if (post.workoutSummary) slides.push({ kind: "summary" });
  if (post.imageUrl) slides.push({ kind: "image", url: post.imageUrl });

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

  const renderSlide = (s: Slide) => {
    if (s.kind === "summary" && post.workoutSummary) {
      return <WorkoutSummaryCard summary={post.workoutSummary} flush />;
    }
    if (s.kind === "image") {
      return (
        <div className="w-full h-full bg-muted relative" onClick={onDoubleTap}>
          <CachedImage
            src={s.url}
            alt="Post"
            className="w-full h-full object-cover max-h-[480px]"
          />
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="h-24 w-24 text-white fill-white drop-shadow-lg animate-ping" />
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (slides.length === 1) {
    return <div className="w-full">{renderSlide(slides[0])}</div>;
  }

  return (
    <div className="relative w-full">
      <Carousel setApi={setApi} opts={{ loop: false }} className="w-full">
        <CarouselContent className="ml-0">
          {slides.map((s, i) => (
            <CarouselItem key={i} className="pl-0 basis-full flex">
              {renderSlide(s)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                current === i ? "bg-white w-3" : "bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
