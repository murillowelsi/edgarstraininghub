import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
    SubscriptionHistoryEntry,
    SubscriptionHistoryDocument,
    SubscriptionPlan,
    SubscriptionStatus,
} from "../types/user";

const SUBSCRIPTION_HISTORY_COLLECTION = "subscriptionHistory";

// Helper to convert Firestore document to SubscriptionHistoryEntry
const docToHistoryEntry = (
    id: string,
    data: SubscriptionHistoryDocument
): SubscriptionHistoryEntry => ({
    id,
    athleteId: data.athleteId,
    plan: data.plan,
    status: data.status,
    startDate: data.startDate?.toDate() || new Date(),
    endDate: data.endDate?.toDate() || new Date(),
    paymentAmount: data.paymentAmount,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy,
});

// Add a new subscription history entry
export const addSubscriptionHistory = async (
    athleteId: string,
    plan: SubscriptionPlan,
    status: SubscriptionStatus,
    startDate: Date,
    endDate: Date,
    createdBy: string,
    paymentAmount?: number,
    paymentMethod?: string,
    notes?: string
): Promise<string> => {
    const docRef = await addDoc(collection(db, SUBSCRIPTION_HISTORY_COLLECTION), {
        athleteId,
        plan,
        status,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        paymentAmount: paymentAmount || null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        createdAt: serverTimestamp(),
        createdBy,
    });

    return docRef.id;
};

// Get subscription history for a specific athlete
export const getAthleteSubscriptionHistory = async (
    athleteId: string
): Promise<SubscriptionHistoryEntry[]> => {
    // Note: We don't use orderBy here to avoid needing a composite index
    // Sorting is done in JavaScript instead
    const q = query(
        collection(db, SUBSCRIPTION_HISTORY_COLLECTION),
        where("athleteId", "==", athleteId)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map((doc) =>
        docToHistoryEntry(doc.id, doc.data() as SubscriptionHistoryDocument)
    );

    // Sort by createdAt descending in JavaScript
    return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Get all subscription history entries
export const getAllSubscriptionHistory = async (): Promise<
    SubscriptionHistoryEntry[]
> => {
    const q = query(
        collection(db, SUBSCRIPTION_HISTORY_COLLECTION),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
        docToHistoryEntry(doc.id, doc.data() as SubscriptionHistoryDocument)
    );
};

// Update a subscription history entry
export const updateSubscriptionHistoryEntry = async (
    id: string,
    updates: Partial<SubscriptionHistoryEntry>
): Promise<void> => {
    const docRef = doc(db, SUBSCRIPTION_HISTORY_COLLECTION, id);

    // Convert dates back to Timestamps if present
    const firestoreUpdates: any = { ...updates };
    if (updates.startDate) firestoreUpdates.startDate = Timestamp.fromDate(updates.startDate);
    if (updates.endDate) firestoreUpdates.endDate = Timestamp.fromDate(updates.endDate);
    if (updates.createdAt) delete firestoreUpdates.createdAt; // Don't update creation time usually

    await updateDoc(docRef, firestoreUpdates);
};

// Delete a subscription history entry
export const deleteSubscriptionHistoryEntry = async (id: string): Promise<void> => {
    const docRef = doc(db, SUBSCRIPTION_HISTORY_COLLECTION, id);
    await deleteDoc(docRef);
};
