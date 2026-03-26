import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  TimelineComment,
  TimelineCommentDocument,
  TimelinePost,
  TimelinePostDocument,
  TimelinePostFormData,
} from "../types/timeline";
import type { UserRole } from "../types/user";

const COLLECTION = "timeline_posts";
const POSTS_PER_PAGE = 10;

const docToPost = (id: string, data: TimelinePostDocument): TimelinePost => ({
  id,
  authorId: data.authorId,
  authorName: data.authorName,
  authorRole: data.authorRole,
  authorPhotoURL: data.authorPhotoURL,
  caption: data.caption,
  imageUrl: data.imageUrl,
  likedBy: data.likedBy || [],
  commentsCount: data.commentsCount || 0,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

const docToComment = (id: string, data: TimelineCommentDocument): TimelineComment => ({
  id,
  authorId: data.authorId,
  authorName: data.authorName,
  authorRole: data.authorRole,
  authorPhotoURL: data.authorPhotoURL,
  text: data.text,
  replyTo: data.replyTo,
  likedBy: data.likedBy || [],
  createdAt: data.createdAt?.toDate() || new Date(),
});

export const subscribeToTimelinePosts = (
  callback: (result: { posts: TimelinePost[]; hasMore: boolean; lastTimestamp?: Timestamp }) => void
): (() => void) => {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    limit(POSTS_PER_PAGE + 1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: TimelinePost[] = [];
      let lastTimestamp: Timestamp | undefined;

      snapshot.docs.slice(0, POSTS_PER_PAGE).forEach((d) => {
        const data = d.data() as TimelinePostDocument;
        posts.push(docToPost(d.id, data));
        lastTimestamp = data.createdAt;
      });

      callback({ posts, hasMore: snapshot.docs.length > POSTS_PER_PAGE, lastTimestamp });
    },
    (error) => console.error("Timeline snapshot error:", error)
  );
};

export const getTimelinePosts = async (
  lastDoc?: Timestamp
): Promise<{ posts: TimelinePost[]; hasMore: boolean; lastTimestamp?: Timestamp }> => {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(POSTS_PER_PAGE + 1)
  );

  const snapshot = await getDocs(q);
  const posts: TimelinePost[] = [];
  let lastTimestamp: Timestamp | undefined;

  snapshot.docs.slice(0, POSTS_PER_PAGE).forEach((d) => {
    const data = d.data() as TimelinePostDocument;
    posts.push(docToPost(d.id, data));
    lastTimestamp = data.createdAt;
  });

  return {
    posts,
    hasMore: snapshot.docs.length > POSTS_PER_PAGE,
    lastTimestamp,
  };
};

export const createTimelinePost = async (
  data: TimelinePostFormData,
  authorId: string,
  authorName: string,
  authorRole: UserRole,
  authorPhotoURL?: string | null
): Promise<string> => {
  const payload: Record<string, unknown> = {
    authorId,
    authorName,
    authorRole,
    caption: data.caption,
    imageUrl: data.imageUrl || "",
    likedBy: [],
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (authorPhotoURL) payload.authorPhotoURL = authorPhotoURL;
  const docRef = await addDoc(collection(db, COLLECTION), payload);
  return docRef.id;
};

export const deleteTimelinePost = async (postId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, postId));
};

export const toggleLike = async (postId: string, userId: string, isLiked: boolean): Promise<void> => {
  const postRef = doc(db, COLLECTION, postId);
  await updateDoc(postRef, {
    likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
};

export const getComments = async (postId: string): Promise<TimelineComment[]> => {
  const q = query(
    collection(db, COLLECTION, postId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToComment(d.id, d.data() as TimelineCommentDocument));
};

export const addComment = async (
  postId: string,
  text: string,
  authorId: string,
  authorName: string,
  authorRole: UserRole,
  replyTo?: { commentId: string; authorName: string },
  authorPhotoURL?: string | null
): Promise<TimelineComment> => {
  const commentsRef = collection(db, COLLECTION, postId, "comments");
  const payload: Record<string, unknown> = {
    authorId,
    authorName,
    authorRole,
    text,
    likedBy: [],
    createdAt: serverTimestamp(),
  };
  if (replyTo) payload.replyTo = replyTo;
  if (authorPhotoURL) payload.authorPhotoURL = authorPhotoURL;

  const docRef = await addDoc(commentsRef, payload);

  await updateDoc(doc(db, COLLECTION, postId), {
    commentsCount: increment(1),
  });

  return {
    id: docRef.id,
    authorId,
    authorName,
    authorRole,
    authorPhotoURL: authorPhotoURL ?? undefined,
    text,
    replyTo,
    likedBy: [],
    createdAt: new Date(),
  };
};

export const toggleCommentLike = async (
  postId: string,
  commentId: string,
  userId: string,
  isLiked: boolean
): Promise<void> => {
  const commentRef = doc(db, COLLECTION, postId, "comments", commentId);
  await updateDoc(commentRef, {
    likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
};

export const deleteComment = async (postId: string, commentId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, postId, "comments", commentId));
  await updateDoc(doc(db, COLLECTION, postId), {
    commentsCount: increment(-1),
  });
};

// ─── Mention notifications ────────────────────────────────────────────────────

export const createMentionNotifications = async (
  postId: string,
  mentionedUserIds: string[],
  authorName: string,
  captionPreview: string
): Promise<void> => {
  await Promise.all(
    mentionedUserIds.map((uid) =>
      addDoc(collection(db, "users", uid, "timelineNotifications"), {
        postId,
        authorName,
        caption: captionPreview.slice(0, 80),
        read: false,
        createdAt: serverTimestamp(),
      })
    )
  );
};

export const createActivityNotification = async (
  postAuthorId: string,
  actorName: string,
  postId: string,
  type: "like" | "comment"
): Promise<void> => {
  await addDoc(collection(db, "users", postAuthorId, "timelineNotifications"), {
    postId,
    authorName: actorName,
    type,
    read: false,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToMentionCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const q = query(
    collection(db, "users", userId, "timelineNotifications"),
    where("read", "==", false)
  );
  return onSnapshot(q, (snap) => callback(snap.size), (err) => console.error("[FeedBadge] subscription error:", err));
};

export const markMentionsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, "users", userId, "timelineNotifications"),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
};

// ─── Activity notifications list ─────────────────────────────────────────────

export interface ActivityNotification {
  id: string;
  postId: string;
  authorName: string;
  type: "like" | "comment" | "mention";
  caption?: string;
  read: boolean;
  createdAt: Date;
  // Enriched fields (loaded after)
  postImageUrl?: string;
  actorPhotoURL?: string;
}

export const subscribeToActivityNotifications = (
  userId: string,
  callback: (notifications: ActivityNotification[]) => void
): (() => void) => {
  const q = query(
    collection(db, "users", userId, "timelineNotifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, async (snap) => {
    const notifications: ActivityNotification[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        postId: data.postId,
        authorName: data.authorName,
        type: data.type || "mention",
        caption: data.caption,
        read: data.read,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    });
    callback(notifications);

    // Enrich with post images and actor photos in background
    const postIds = [...new Set(notifications.map((n) => n.postId))];
    const postMap = new Map<string, string>();
    await Promise.all(
      postIds.map(async (pid) => {
        try {
          const postSnap = await getDoc(doc(db, COLLECTION, pid));
          if (postSnap.exists()) {
            const data = postSnap.data() as TimelinePostDocument;
            if (data.imageUrl) postMap.set(pid, data.imageUrl);
          }
        } catch { /* ignore */ }
      })
    );

    // Enrich actor photos by name lookup
    const actorNames = [...new Set(notifications.map((n) => n.authorName))];
    const actorPhotoMap = new Map<string, string>();
    await Promise.all(
      actorNames.map(async (name) => {
        try {
          const usersQ = query(collection(db, "users"), where("displayName", "==", name), limit(1));
          const usersSnap = await getDocs(usersQ);
          if (!usersSnap.empty) {
            const userData = usersSnap.docs[0].data();
            if (userData.photoURL) actorPhotoMap.set(name, userData.photoURL);
          }
        } catch { /* ignore */ }
      })
    );

    const enriched = notifications.map((n) => ({
      ...n,
      postImageUrl: postMap.get(n.postId),
      actorPhotoURL: actorPhotoMap.get(n.authorName),
    }));
    callback(enriched);
  });
};
