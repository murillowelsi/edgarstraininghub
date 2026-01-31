import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Post, PostDocument, PostFormData } from "../types/post";

const POSTS_COLLECTION = "posts";
const POSTS_PER_PAGE = 10;

// Helper to convert Firestore document to Post
const docToPost = (id: string, data: PostDocument): Post => ({
  id,
  title: data.title,
  slug: data.slug,
  content: data.content,
  excerpt: data.excerpt,
  featuredImage: data.featuredImage,
  published: data.published,
  authorId: data.authorId,
  authorName: data.authorName,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Generate slug from title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .substring(0, 100); // Limit length
};

// Check if slug is unique
export const isSlugUnique = async (
  slug: string,
  excludeId?: string
): Promise<boolean> => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("slug", "==", slug)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return true;
  if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
    return true;
  }
  return false;
};

// Get published posts for public blog (paginated)
export const getPublishedPosts = async (
  lastDoc?: Timestamp
): Promise<{ posts: Post[]; hasMore: boolean; lastTimestamp?: Timestamp }> => {
  let q = query(
    collection(db, POSTS_COLLECTION),
    where("published", "==", true),
    orderBy("createdAt", "desc"),
    limit(POSTS_PER_PAGE + 1) // Fetch one extra to check if there's more
  );

  if (lastDoc) {
    q = query(
      collection(db, POSTS_COLLECTION),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(POSTS_PER_PAGE + 1)
    );
  }

  const snapshot = await getDocs(q);
  const posts: Post[] = [];
  let lastTimestamp: Timestamp | undefined;

  snapshot.docs.slice(0, POSTS_PER_PAGE).forEach((doc) => {
    const data = doc.data() as PostDocument;
    posts.push(docToPost(doc.id, data));
    lastTimestamp = data.createdAt;
  });

  return {
    posts,
    hasMore: snapshot.docs.length > POSTS_PER_PAGE,
    lastTimestamp,
  };
};

// Get all posts for admin (including unpublished)
export const getAllPosts = async (): Promise<Post[]> => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToPost(doc.id, doc.data() as PostDocument)
  );
};

// Get single post by slug (for public view)
export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  const q = query(
    collection(db, POSTS_COLLECTION),
    where("slug", "==", slug),
    where("published", "==", true),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return docToPost(doc.id, doc.data() as PostDocument);
};

// Get single post by ID (for admin edit)
export const getPostById = async (id: string): Promise<Post | null> => {
  const docRef = doc(db, POSTS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return docToPost(snapshot.id, snapshot.data() as PostDocument);
};

// Create new post
export const createPost = async (
  data: PostFormData,
  authorId: string,
  authorName: string
): Promise<string> => {
  // Ensure slug is unique
  let slug = data.slug || generateSlug(data.title);
  const isUnique = await isSlugUnique(slug);
  if (!isUnique) {
    slug = `${slug}-${Date.now()}`;
  }

  const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
    title: data.title,
    slug,
    content: data.content,
    excerpt: data.excerpt,
    featuredImage: data.featuredImage || "",
    published: data.published,
    authorId,
    authorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

// Update existing post
export const updatePost = async (
  id: string,
  data: PostFormData
): Promise<void> => {
  // Ensure slug is unique (excluding current post)
  let slug = data.slug || generateSlug(data.title);
  const isUnique = await isSlugUnique(slug, id);
  if (!isUnique) {
    slug = `${slug}-${Date.now()}`;
  }

  const docRef = doc(db, POSTS_COLLECTION, id);
  await updateDoc(docRef, {
    title: data.title,
    slug,
    content: data.content,
    excerpt: data.excerpt,
    featuredImage: data.featuredImage || "",
    published: data.published,
    updatedAt: serverTimestamp(),
  });
};

// Delete post
export const deletePost = async (id: string): Promise<void> => {
  const docRef = doc(db, POSTS_COLLECTION, id);
  await deleteDoc(docRef);
};
