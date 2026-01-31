// Post data model for the blog
export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML content from rich text editor
  excerpt: string;
  published: boolean;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating/editing posts
export interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
}

// Firestore document data (timestamps as Firestore types)
export interface PostDocument {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published: boolean;
  authorId: string;
  authorName: string;
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}
