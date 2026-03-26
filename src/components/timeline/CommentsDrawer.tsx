import { useEffect, useRef, useState } from "react";
import { Heart, Loader2, Send, Trash2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { addComment, deleteComment, getComments, toggleCommentLike, createActivityNotification } from "@/services/timelineService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TimelineComment } from "@/types/timeline";
import { formatDistanceToNow } from "date-fns";

interface CommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postAuthorId: string;
  onCommentsCountChange: (delta: number) => void;
}

interface ReplyingTo {
  commentId: string;
  authorId: string;
  authorName: string;
}

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

export function CommentsDrawer({ open, onOpenChange, postId, postAuthorId, onCommentsCountChange }: CommentsDrawerProps) {
  const { user, userRole, isAdmin, displayName, photoURL } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getComments(postId)
      .then(setComments)
      .catch(() => toast({ title: "Error", description: "Could not load comments.", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open, postId]);

  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
        createActivityNotification(uid, authorName, postId, "comment").catch((err) => console.error("[FeedBadge] comment notification failed:", err));
      }
      setText("");
      setReplyingTo(null);
    } catch {
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to delete comment.", variant: "destructive" });
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
          <Avatar className={cn(isReply ? "h-7 w-7" : "h-9 w-9")}>
            {comment.authorPhotoURL && <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName} className="object-cover" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(comment.authorName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.createdAt, { addSuffix: false })}
            </span>
          </div>
          <p className="text-sm text-foreground mt-0.5 break-words">
            {comment.replyTo && (
              <span className="text-primary font-medium mr-1">@{comment.replyTo.authorName}</span>
            )}
            {comment.text}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {!isReply && (
              <button
                onClick={() => handleReply(comment)}
                className="text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors"
              >
                Responder
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(comment.id, comment.authorId)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Like button */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
          <button
            onClick={() => handleCommentLike(comment.id)}
            className={cn(
              "transition-transform active:scale-125",
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          </button>
          {likes > 0 && (
            <span className="text-[10px] text-muted-foreground">{likes}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80dvh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-3">
          <DrawerTitle className="text-center text-base font-bold">Comentários</DrawerTitle>
        </DrawerHeader>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sem comentários ainda. Seja o primeiro!
            </p>
          ) : (
            topLevel.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {repliesFor(comment.id).map((reply) => renderComment(reply, true))}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply banner */}
        {replyingTo && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-muted/50 border-t text-sm">
            <span className="text-muted-foreground">
              Respondendo a <span className="font-semibold text-foreground">@{replyingTo.authorName}</span>
            </span>
            <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Quick emojis */}
        <div className="shrink-0 flex items-center justify-around px-4 py-2 border-t">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setText((prev) => prev + emoji)}
              className="text-xl hover:scale-125 transition-transform active:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t px-4 py-3 flex gap-3 items-center bg-background">
          <Avatar className="h-9 w-9 shrink-0">
            {photoURL && <AvatarImage src={photoURL} alt="Profile" className="object-cover" />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(displayName || user?.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center bg-muted rounded-full px-4 py-2 gap-2">
            <input
              ref={inputRef}
              placeholder={replyingTo ? `Responder a @${replyingTo.authorName}…` : "Participe da conversa..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
            />
            {text.trim() && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="text-primary font-semibold text-sm shrink-0"
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
