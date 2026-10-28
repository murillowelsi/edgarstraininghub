import { useEffect, useRef, useState } from "react";
import { ChevronRight, Flame, Loader2, Send, Trash2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { addComment, deleteComment, getComments, toggleCommentLike, createActivityNotification } from "@/services/timelineService";
import { getAllUsers } from "@/services/usersService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TimelineComment } from "@/types/timeline";
import { useLanguage } from "@/contexts/LanguageContext";
import { fullDateTime, relativeTime } from "./relativeTime";

interface CommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postAuthorId: string;
  onCommentsCountChange: (delta: number) => void;
  /** Shown above the comments when opened away from the post (from Activity) */
  postContext?: { title: string; onViewPost: () => void } | null;
}

interface ReplyingTo {
  commentId: string;
  authorId: string;
  authorName: string;
}

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

export function CommentsDrawer({ open, onOpenChange, postId, postAuthorId, onCommentsCountChange, postContext }: CommentsDrawerProps) {
  const { user, userRole, isAdmin, displayName, photoURL } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getComments(postId)
      .then(setComments)
      .catch(() => toast({ title: t.common.error, description: t.timeline.comments.loadError, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, postId]);

  // Scroll only the list: scrollIntoView also scrolls every ancestor, including the
  // overflow-hidden sheet while it animates in, which pushed the title and comments
  // out of view and left an empty gap at the bottom
  useEffect(() => {
    const list = listRef.current;
    if (comments.length > 0 && list) {
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    }
  }, [comments.length]);

  const handleReply = (comment: TimelineComment) => {
    setReplyingTo({ commentId: comment.id, authorId: comment.authorId, authorName: comment.authorName });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const isLiked = comment.likedBy.includes(user.uid);
    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likedBy: isLiked
                ? c.likedBy.filter((id) => id !== user.uid)
                : [...c.likedBy, user.uid],
            }
          : c
      )
    );
    try {
      await toggleCommentLike(postId, commentId, user.uid, isLiked);
    } catch {
      // Revert on error
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                likedBy: isLiked
                  ? [...c.likedBy, user.uid]
                  : c.likedBy.filter((id) => id !== user.uid),
              }
            : c
        )
      );
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || !user || !userRole) return;
    setSubmitting(true);
    try {
      const authorName = displayName || user.email || "User";
      const newComment = await addComment(
        postId,
        text.trim(),
        user.uid,
        authorName,
        userRole,
        replyingTo ?? undefined,
        photoURL
      );
      setComments((prev) => [...prev, newComment]);
      onCommentsCountChange(1);
      // Collect unique user IDs to notify (post author + all previous commenters + reply target)
      const notifySet = new Set<string>();
      if (postAuthorId !== user.uid) notifySet.add(postAuthorId);
      if (replyingTo && replyingTo.authorId !== user.uid) notifySet.add(replyingTo.authorId);
      // Notify all other users who previously commented on this post
      for (const c of comments) {
        if (c.authorId !== user.uid) notifySet.add(c.authorId);
      }
      for (const uid of notifySet) {
        createActivityNotification(uid, authorName, postId, "comment", user.uid).catch((err) => console.error("[FeedBadge] comment notification failed:", err));
      }
      // Notify mentioned users in the comment text
      const mentionMatches = text.trim().match(/@([\w\s]+?)(?=\s@|\s*$|[^a-zA-Z\s])/g);
      if (mentionMatches) {
        const mentionNames = mentionMatches.map((m) => m.slice(1).trim());
        getAllUsers().then((allUsers) => {
          for (const mentionName of mentionNames) {
            const mentionedUser = allUsers.find((u) => u.displayName?.toLowerCase() === mentionName.toLowerCase());
            if (mentionedUser && mentionedUser.id !== user.uid && !notifySet.has(mentionedUser.id)) {
              createActivityNotification(mentionedUser.id, authorName, postId, "comment_mention", user.uid).catch(() => null);
            }
          }
        }).catch(() => null);
      }
      setText("");
      setReplyingTo(null);
    } catch {
      toast({ title: t.common.error, description: t.timeline.comments.postError, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string, authorId: string) => {
    if (!user) return;
    if (user.uid !== authorId && !isAdmin) return;
    try {
      await deleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentsCountChange(-1);
    } catch {
      toast({ title: t.common.error, description: t.timeline.comments.deleteError, variant: "destructive" });
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const topLevel = comments.filter((c) => !c.replyTo);
  const repliesFor = (commentId: string) => comments.filter((c) => c.replyTo?.commentId === commentId);

  const renderComment = (comment: TimelineComment, isReply = false) => {
    const isLiked = user ? comment.likedBy.includes(user.uid) : false;
    const likes = comment.likedBy.length;
    const canDelete = user?.uid === comment.authorId || isAdmin;

    return (
      <div key={comment.id} className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
        {/* Avatar */}
        <div className="shrink-0">
          <CachedAvatar
            src={comment.authorPhotoURL}
            alt={comment.authorName}
            fallback={getInitials(comment.authorName)}
            className={cn(isReply ? "h-7 w-7" : "h-9 w-9", "ring-2 ring-[#e1b506]")}
            fallbackClassName="bg-primary text-primary-foreground text-xs font-semibold"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{comment.authorName}</span>
            <time
              dateTime={comment.createdAt.toISOString()}
              title={fullDateTime(comment.createdAt, language)}
              className="text-xs text-muted-foreground"
            >
              {relativeTime(comment.createdAt, language, t.timeline.time.now)}
            </time>
          </div>
          <p className="text-sm text-foreground mt-0.5 break-words">
            {comment.replyTo && (
              <span className="text-primary font-medium mr-1">@{comment.replyTo.authorName}</span>
            )}
            {comment.text}
          </p>
          {/* 40px hit areas; negative margins keep the text where it was */}
          <div className="flex items-center -mt-1 -mb-2 -ml-2">
            {!isReply && (
              <button
                onClick={() => handleReply(comment)}
                className="min-h-10 px-2 text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors"
              >
                {t.timeline.comments.reply}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(comment.id, comment.authorId)}
                aria-label={t.timeline.comments.delete}
                className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Like button */}
        <div className="shrink-0 flex flex-col items-center -mt-2 -mr-2">
          <button
            onClick={() => handleCommentLike(comment.id)}
            aria-pressed={isLiked}
            aria-label={(isLiked ? t.timeline.comments.unlike : t.timeline.comments.like).replace("{{n}}", String(likes))}
            className={cn(
              "h-10 w-10 flex items-center justify-center transition-transform active:scale-125",
              isLiked ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className={cn("h-4 w-4", isLiked && "fill-current")} aria-hidden />
          </button>
          {likes > 0 && (
            <span className="-mt-2 text-[11px] text-muted-foreground" aria-hidden>{likes}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80dvh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-3">
          <DrawerTitle className="text-center text-base font-bold">{t.timeline.comments.title}</DrawerTitle>
        </DrawerHeader>

        {/* Which post these comments belong to, when opened from Activity */}
        {postContext && (
          <div className="shrink-0 mx-4 mb-2 flex items-center gap-3 rounded-xl bg-muted/60 pl-3 pr-1">
            <div className="flex-1 min-w-0 py-2">
              <p className="text-[11px] text-muted-foreground">{t.timeline.comments.onPost}</p>
              <p className="text-sm font-medium truncate">{postContext.title}</p>
            </div>
            <button
              onClick={postContext.onViewPost}
              className="shrink-0 min-h-10 flex items-center gap-0.5 px-2 text-sm font-semibold text-primary"
            >
              {t.timeline.comments.viewPost}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {/* Comments list */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t.timeline.comments.empty}
            </p>
          ) : (
            topLevel.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {repliesFor(comment.id).map((reply) => renderComment(reply, true))}
              </div>
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyingTo && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-muted/50 border-t text-sm">
            <span className="text-muted-foreground">
              {t.timeline.comments.replyingTo} <span className="font-semibold text-foreground">@{replyingTo.authorName}</span>
            </span>
            <button
              onClick={cancelReply}
              aria-label={t.timeline.comments.cancelReply}
              className="-my-2 -mr-3 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {/* Quick emojis */}
        <div className="shrink-0 flex items-center px-2 border-t">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setText((prev) => prev + emoji)}
              aria-label={t.timeline.comments.addEmoji.replace("{{emoji}}", emoji)}
              className="h-11 flex-1 min-w-0 flex items-center justify-center text-xl hover:scale-125 transition-transform active:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t px-4 py-3 flex gap-3 items-center bg-background">
          <CachedAvatar
            src={photoURL}
            alt="Profile"
            fallback={getInitials(displayName || user?.email || "U")}
            className="h-9 w-9 shrink-0 ring-2 ring-[#e1b506]"
            fallbackClassName="bg-primary text-primary-foreground text-xs font-semibold"
          />
          <div className="flex-1 min-h-11 flex items-center bg-muted rounded-full pl-4 pr-1 gap-1">
            <input
              ref={inputRef}
              aria-label={t.timeline.comments.placeholder}
              placeholder={replyingTo ? t.timeline.comments.replyPlaceholder.replace("{{name}}", replyingTo.authorName) : t.timeline.comments.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 h-11 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
            />
            {text.trim() && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                aria-label={t.timeline.comments.send}
                className="h-10 w-10 flex items-center justify-center text-primary font-semibold text-sm shrink-0"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
