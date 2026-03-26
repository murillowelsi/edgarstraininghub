import { useEffect, useState } from "react";
import { Heart, MessageCircle, AtSign, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { subscribeToActivityNotifications, markMentionsRead } from "@/services/timelineService";
import type { ActivityNotification } from "@/services/timelineService";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { CommentsDrawer } from "./CommentsDrawer";

interface ActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupByDate(notifications: ActivityNotification[]): { label: string; items: ActivityNotification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ActivityNotification[] }[] = [
    { label: "Hoje", items: [] },
    { label: "Ontem", items: [] },
    { label: "Ultimos 7 dias", items: [] },
    { label: "Anteriores", items: [] },
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
    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
      <Heart className="h-3 w-3 text-white fill-white" />
    </div>
  );
  if (type === "comment") return (
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

function NotificationText({ notification }: { notification: ActivityNotification }) {
  const { authorName, type, caption } = notification;
  if (type === "like") return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> curtiu sua publicacao.</span>
    </p>
  );
  if (type === "comment") return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> comentou na sua publicacao.</span>
    </p>
  );
  return (
    <p className="text-sm">
      <span className="font-semibold">{authorName}</span>
      <span className="text-muted-foreground"> mencionou voce: </span>
      {caption && <span className="text-muted-foreground italic">{caption}</span>}
    </p>
  );
}

export function ActivityDrawer({ open, onOpenChange }: ActivityDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    const unsubscribe = subscribeToActivityNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    // Mark all as read when opening the drawer
    markMentionsRead(user.uid).catch(() => null);

    return unsubscribe;
  }, [open, user]);

  const handleClick = (notification: ActivityNotification) => {
    if (notification.type === "comment" || notification.type === "mention") {
      setCommentsPostId(notification.postId);
    } else {
      onOpenChange(false);
      const isAdmin = window.location.pathname.startsWith("/admin");
      const basePath = isAdmin ? "/admin/timeline" : "/athlete/timeline";
      navigate(basePath, { state: { scrollToPostId: notification.postId } });
    }
  };

  const groups = groupByDate(notifications);

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-3">
          <DrawerTitle className="text-center text-base font-bold">Atividade</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nenhuma atividade ainda</p>
              <p className="text-xs mt-1">Quando alguem interagir com seus posts, aparecera aqui.</p>
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
                        !n.read && "bg-accent/30"
                      )}
                    >
                      {/* Actor avatar with type icon */}
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-[#e1b506]">
                          {n.actorPhotoURL && <AvatarImage src={n.actorPhotoURL} alt={n.authorName} className="object-cover" />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {n.authorName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <NotificationIcon type={n.type} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <NotificationText notification={n} />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(n.createdAt, { addSuffix: false, locale: ptBR })}
                        </p>
                      </div>

                      {/* Post thumbnail */}
                      {n.postImageUrl && (
                        <div className="shrink-0 h-11 w-11 rounded-md overflow-hidden">
                          <img src={n.postImageUrl} alt="" className="h-full w-full object-cover" />
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
        onOpenChange={(o) => { if (!o) setCommentsPostId(null); }}
        postId={commentsPostId}
        postAuthorId={user.uid}
        onCommentsCountChange={() => {}}
      />
    )}
  </>
  );
}
