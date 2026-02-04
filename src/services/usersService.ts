import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, secondaryAuth } from "../lib/firebase";
import type { User, UserDocument, UserFormData, SubscriptionStatus, SubscriptionPlan } from "../types/user";

const USERS_COLLECTION = "users";

// Helper to convert Firestore document to User
const docToUser = async (id: string, data: UserDocument): Promise<User> => {
  let email = data.email;

  // If email is not in Firestore, try to get it from Firebase Auth
  if (!email) {
    try {
      const authInstance = getAuth();
      const authUser = authInstance.currentUser;
      if (authUser && authUser.uid === id) {
        email = authUser.email || "";
      }
    } catch (error) {
      console.error("Error fetching email from Auth:", error);
    }
  }

  return {
    id,
    email: email || "",
    displayName: data.displayName,
    role: data.role,
    subscriptionStatus: data.subscriptionStatus || (data.role === "athlete" ? "inactive" : "active"),
    subscriptionPlan: data.subscriptionPlan || (data.role === "athlete" ? "none" : "yearly"),
    subscriptionStartDate: data.subscriptionStartDate?.toDate(),
    subscriptionEndDate: data.subscriptionEndDate?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return Promise.all(
    snapshot.docs.map((doc) => docToUser(doc.id, doc.data() as UserDocument))
  );
};

// Get single user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const docRef = doc(db, USERS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return await docToUser(snapshot.id, snapshot.data() as UserDocument);
};

// Create new user (creates both Auth user and Firestore document)
// Uses secondary auth instance to avoid logging out the current admin
export const createUser = async (data: UserFormData): Promise<string> => {
  if (!data.password) {
    throw new Error("Password is required for new users");
  }

  // Create Firebase Auth user using secondary auth (doesn't affect current session)
  const userCredential = await createUserWithEmailAndPassword(
    secondaryAuth,
    data.email,
    data.password
  );

  const uid = userCredential.user.uid;

  // Sign out from secondary auth immediately
  await secondaryAuth.signOut();

  // Create Firestore user document
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    subscriptionStatus: data.subscriptionStatus || (data.role === "athlete" ? "inactive" : "active"),
    subscriptionPlan: data.subscriptionPlan || (data.role === "athlete" ? "none" : "yearly"),
    subscriptionStartDate: data.subscriptionStartDate || null,
    subscriptionEndDate: data.subscriptionEndDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return uid;
};

// Update existing user (Firestore document only)
export const updateUser = async (
  id: string,
  data: Partial<UserFormData>
): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, id);

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }
  if (data.subscriptionStatus !== undefined) {
    updateData.subscriptionStatus = data.subscriptionStatus;
  }
  if (data.subscriptionPlan !== undefined) {
    updateData.subscriptionPlan = data.subscriptionPlan;
  }
  if (data.subscriptionStartDate !== undefined) {
    updateData.subscriptionStartDate = data.subscriptionStartDate;
  }
  if (data.subscriptionEndDate !== undefined) {
    updateData.subscriptionEndDate = data.subscriptionEndDate;
  }

  await updateDoc(docRef, updateData);
};

// Delete user (Firestore document only - Auth user remains)
// Note: To fully delete a user, you'd need Firebase Admin SDK
export const deleteUser = async (id: string): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, id);
  await deleteDoc(docRef);
};

// Get users by role
export const getUsersByRole = async (role: string): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where("role", "==", role)
  );
  const snapshot = await getDocs(q);
  const users = await Promise.all(
    snapshot.docs.map((doc) => docToUser(doc.id, doc.data() as UserDocument))
  );
  // Sort by displayName in JavaScript to avoid needing a composite index
  return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
};

// Update subscription status for a user
export const updateSubscription = async (
  id: string,
  status: SubscriptionStatus,
  plan: SubscriptionPlan,
  startDate?: Date,
  endDate?: Date
): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, id);

  const updateData: Record<string, unknown> = {
    subscriptionStatus: status,
    subscriptionPlan: plan,
    updatedAt: serverTimestamp(),
  };

  if (startDate !== undefined) {
    updateData.subscriptionStartDate = startDate;
  }
  if (endDate !== undefined) {
    updateData.subscriptionEndDate = endDate;
  }

  await updateDoc(docRef, updateData);
};

// Get all athletes
export const getAllAthletes = async (): Promise<User[]> => {
  return getUsersByRole("athlete");
};
