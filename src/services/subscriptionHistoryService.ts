import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
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
