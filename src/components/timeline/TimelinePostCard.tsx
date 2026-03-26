import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toggleLike, deleteTimelinePost, createActivityNotification } from "@/services/timelineService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CommentsDrawer } from "./CommentsDrawer";
import type { TimelinePost } from "@/types/timeline";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimelinePostCardProps {
  post: TimelinePost;
  onDeleted: (postId: string) => void;
}

export function TimelinePostCard({ post, onDeleted }: TimelinePostCardProps) {
  const { user, isAdmin, displayName } = useAuth();
  const { toast } = useToast();

  // Source of truth comes from the real-time subscription via `post` prop.
  // pendingLike: null = no in-flight, true/false = optimistic override while request is running
  const [pendingLike, setPendingLike] = useState<boolean | null>(null);
  // commentsDelta: local offset applied on top of post.commentsCount until subscription confirms
  const [commentsDelta, setCommentsDelta] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const isLiked = user ? post.likedBy.includes(user.uid) : false;
  const liked = pendingLike ?? isLiked;
  const likesCount = post.likedBy.length + (pendingLike !== null && pendingLike !== isLiked ? (pendingLike ? 1 : -1) : 0);
  const commentsCount = post.commentsCount + commentsDelta;

  // Reset commentsDelta once the subscription confirms the new count
  useEffect(() => {
    setCommentsDelta(0);
  }, [post.commentsCount]);
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
      toast({ title: "Error", description: "Could not update like.", variant: "destructive" });
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
    try {
      await deleteTimelinePost(post.id);
      onDeleted(post.id);
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete post.", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <>
      <article className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-white">
              {post.authorPhotoURL && <AvatarImage src={post.authorPhotoURL} alt={post.authorName} className="object-cover" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {getInitials(post.authorName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold">{post.authorName}</p>
          </div>

          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full hover:bg-accent transition-colors">
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="w-full bg-muted relative" onClick={handleDoubleTap}>
            <img
              src={post.imageUrl}
              alt="Post"
              className="w-full object-cover max-h-[480px]"
              loading="lazy"
            />
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="h-24 w-24 text-white fill-white drop-shadow-lg animate-ping" />
              </div>
            )}
          </div>
        )}

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
          {formatDistanceToNow(post.createdAt, { addSuffix: true })}
        </p>
      </article>

      <CommentsDrawer
        open={showComments}
        onOpenChange={setShowComments}
        postId={post.id}
        postAuthorId={post.authorId}
        onCommentsCountChange={(delta) => setCommentsDelta((prev) => prev + delta)}
      />
    </>
  );
}
