// User roles
export type UserRole = "admin" | "editor" | "athlete";

// Subscription status
export type SubscriptionStatus = "active" | "inactive" | "expired" | "trial";

// Subscription plan types
export type SubscriptionPlan = "monthly" | "quarterly" | "yearly" | "none";

// User data model
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating/editing users
export interface UserFormData {
  email: string;
  displayName: string;
  role: UserRole;
  password?: string; // Only for creating new users
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
}

// Firestore document data
export interface UserDocument {
  email: string;
  displayName: string;
  role: UserRole;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartDate?: import("firebase/firestore").Timestamp;
  subscriptionEndDate?: import("firebase/firestore").Timestamp;
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}

// Subscription history entry
export interface SubscriptionHistoryEntry {
  id: string;
  athleteId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  paymentAmount?: number;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

// Firestore subscription history document
export interface SubscriptionHistoryDocument {
  athleteId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: import("firebase/firestore").Timestamp;
  endDate: import("firebase/firestore").Timestamp;
  paymentAmount?: number;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: import("firebase/firestore").Timestamp;
  createdBy: string;
}
