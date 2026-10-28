import { useEffect, useRef, useState } from "react";
import { Flame, MessageCircle, AtSign, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CachedAvatar, CachedImage } from "@/components/ui/cached-avatar";
import { cn } from "@/lib/utils";
import { subscribeToActivityNotifications, markMentionsRead, getTimelinePost } from "@/services/timelineService";
import type { ActivityNotification } from "@/services/timelineService";
import type { TimelinePost } from "@/types/timeline";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { CommentsDrawer } from "./CommentsDrawer";
import { relativeTime } from "./relativeTime";

interface ActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupByDate(notifications: ActivityNotification[], labels: { today: string; yesterday: string; last7Days: string; older: string }): { label: string; items: ActivityNotification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ActivityNotification[] }[] = [
    { label: labels.today, items: [] },
    { label: labels.yesterday, items: [] },
    { label: labels.last7Days, items: [] },
    { label: labels.older, items: [] },
  ];

  for (const n of notifications) {
    const d = n.createdAt;
    if (d >= today) groups[0].items.push(n);
    else if (d >= yesterday) groups[1].items.push(n);
    else if (d >= weekAgo) groups[2].items.push(n);
    else groups[3].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

function NotificationIcon({ type }: { type: ActivityNotification["type"] }) {
  if (type === "like") return (
    <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-0.5">
      <Flame className="h-3 w-3 text-white fill-white" />
    </div>
  );
  if (type === "comment" || type === "comment_mention") return (
    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
      <MessageCircle className="h-3 w-3 text-white fill-white" />
    </div>
  );
  return (
    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
      <AtSign className="h-3 w-3 text-white" />
    </div>
  );
}

function NotificationText({ notification, translations }: { notification: ActivityNotification; translations: { liked: string; commented: string; mentionedComment: string; mentionedPost: string } }) {
  const { authorName, type, caption } = notification;
  if (type === "like") return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> {translations.liked}</span>
    </p>
  );
  if (type === "comment") return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> {translations.commented}</span>
    </p>
  );
  if (type === "comment_mention") return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> {translations.mentionedComment}</span>
    </p>
  );
  return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> {translations.mentionedPost}</span>
      {caption && <span className="text-muted-foreground italic">{caption}</span>}
    </p>
  );
}

export function ActivityDrawer({ open, onOpenChange }: ActivityDrawerProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsPost, setCommentsPost] = useState<TimelinePost | null>(null);
  // Items that were unread when the drawer opened. They are marked read in the
  // database right away (clears the badge) but stay highlighted while it's open.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenUnread = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    seenUnread.current = new Set();
    setNewIds(new Set());
    const unsubscribe = subscribeToActivityNotifications(user.uid, (notifs) => {
      const fresh = notifs.filter((n) => !n.read && !seenUnread.current.has(n.id));
      if (fresh.length) {
        fresh.forEach((n) => seenUnread.current.add(n.id));
        setNewIds(new Set(seenUnread.current));
        // Mark read only after capturing them, so the highlight isn't lost
        markMentionsRead(user.uid).catch(() => null);
      }
      setNotifications(notifs);
      setLoading(false);
    });
    return unsubscribe;
  }, [open, user]);

  const goToPost = (postId: string) => {
    onOpenChange(false);
    const isAdmin = window.location.pathname.startsWith("/admin");
    const basePath = isAdmin ? "/admin/timeline" : "/athlete/timeline";
    navigate(basePath, { state: { scrollToPostId: postId } });
  };

  const handleClick = (notification: ActivityNotification) => {
    if (notification.type === "comment" || notification.type === "comment_mention") {
      setCommentsPostId(notification.postId);
      setCommentsPost(null);
      // For the context header and the real post author (comment notifications)
      getTimelinePost(notification.postId)
        .then(setCommentsPost)
        .catch(() => null);
    } else {
      // "like" and "mention" (post mention) → navigate to the post
      goToPost(notification.postId);
    }
  };

  const postTitle = (post: TimelinePost) => {
    const firstLine = post.captionAuto ? "" : post.caption.split("\n")[0].trim();
    return post.workoutSummary?.workoutName || firstLine || post.authorName;
  };

  // Your own actions never notify you (only checkable on newer notifications that store actorId)
  const visible = notifications.filter((n) => !(n.actorId && n.actorId === user?.uid));

  // Ignore a late answer for a post the user already moved away from
  const openPost = commentsPost && commentsPost.id === commentsPostId ? commentsPost : null;

  const groups = groupByDate(visible, {
    today: t.timeline.activity.today,
    yesterday: t.timeline.activity.yesterday,
    last7Days: t.timeline.activity.last7Days,
    older: t.timeline.activity.older,
  });

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-3">
          <DrawerTitle className="text-center text-base font-bold">{t.timeline.activity.title}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flame className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium">{t.timeline.activity.noActivity}</p>
              <p className="text-xs mt-1">{t.timeline.activity.noActivityDesc}</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4">
                <h3 className="text-sm font-bold mb-3">{group.label}</h3>
                <div className="space-y-1">
                  {group.items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors",
                        "hover:bg-accent/50 active:bg-accent",
                        newIds.has(n.id) && "bg-primary/10"
                      )}
                    >
                      {/* Actor avatar with type icon */}
                      <div className="relative shrink-0">
                        <CachedAvatar
                          src={n.actorPhotoURL}
                          alt={n.authorName}
                          fallback={n.authorName.charAt(0).toUpperCase()}
                          className="h-11 w-11 ring-2 ring-[#e1b506]"
                          fallbackClassName="bg-primary text-primary-foreground text-sm font-semibold"
                        />
                        <NotificationIcon type={n.type} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <NotificationText notification={n} translations={t.timeline.activity} />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {relativeTime(n.createdAt, language, t.timeline.time.now)}
                        </p>
                      </div>

                      {newIds.has(n.id) && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-primary">
                          <span className="sr-only">{t.timeline.activity.new}</span>
                        </span>
                      )}

                      {/* Post thumbnail */}
                      {n.postImageUrl && (
                        <div className="shrink-0 h-11 w-11 rounded-md overflow-hidden bg-muted">
                          <CachedImage src={n.postImageUrl} className="h-full w-full object-cover" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>

    {commentsPostId && user && (
      <CommentsDrawer
        open={!!commentsPostId}
        onOpenChange={(o) => { if (!o) { setCommentsPostId(null); setCommentsPost(null); } }}
        postId={commentsPostId}
        postAuthorId={openPost?.authorId ?? user.uid}
        onCommentsCountChange={() => {}}
        postContext={
          openPost
            ? {
                title: postTitle(openPost),
                onViewPost: () => {
                  setCommentsPostId(null);
                  setCommentsPost(null);
                  goToPost(openPost.id);
                },
              }
            : null
        }
      />
    )}
  </>
  );
}
