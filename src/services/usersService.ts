import { createUserWithEmailAndPassword } from "firebase/auth";
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
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { User, UserDocument, UserFormData } from "../types/user";

const USERS_COLLECTION = "users";

// Helper to convert Firestore document to User
const docToUser = (id: string, data: UserDocument): User => ({
  id,
  email: data.email,
  displayName: data.displayName,
  role: data.role,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToUser(doc.id, doc.data() as UserDocument)
  );
};

// Get single user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const docRef = doc(db, USERS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return docToUser(snapshot.id, snapshot.data() as UserDocument);
};

// Create new user (creates both Auth user and Firestore document)
export const createUser = async (data: UserFormData): Promise<string> => {
  if (!data.password) {
    throw new Error("Password is required for new users");
  }

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );

  const uid = userCredential.user.uid;

  // Create Firestore user document
  await setDoc(doc(db, USERS_COLLECTION, uid), {
    email: data.email,
    displayName: data.displayName,
    role: data.role,
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

  await updateDoc(docRef, updateData);
};

// Delete user (Firestore document only - Auth user remains)
// Note: To fully delete a user, you'd need Firebase Admin SDK
export const deleteUser = async (id: string): Promise<void> => {
  const docRef = doc(db, USERS_COLLECTION, id);
  await deleteDoc(docRef);
};
