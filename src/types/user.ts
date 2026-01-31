// User roles
export type UserRole = "admin" | "editor" | "athlete";

// User data model
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating/editing users
export interface UserFormData {
  email: string;
  displayName: string;
  role: UserRole;
  password?: string; // Only for creating new users
}

// Firestore document data
export interface UserDocument {
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}
