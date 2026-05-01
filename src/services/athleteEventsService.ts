import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  AthleteEvent,
  AthleteEventDocument,
  AthleteEventFormData,
} from "../types/athleteEvent";

const EVENTS_COLLECTION = "athleteEvents";

const docToEvent = (id: string, data: AthleteEventDocument): AthleteEvent => ({
  id,
  athleteId: data.athleteId,
  title: data.title,
  eventDate: data.eventDate?.toDate() || new Date(),
  type: data.type,
  description: data.description,
  goals: data.goals || [],
  notifiedDays: data.notifiedDays || [],
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

export const createAthleteEvent = async (
  athleteId: string,
  data: AthleteEventFormData
): Promise<string> => {
  const ref = await addDoc(collection(db, EVENTS_COLLECTION), {
    athleteId,
    title: data.title,
    eventDate: Timestamp.fromDate(data.eventDate),
    type: data.type,
    description: data.description ?? "",
    goals: data.goals ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateAthleteEvent = async (
  id: string,
  data: Partial<AthleteEventFormData>
): Promise<void> => {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.title !== undefined) payload.title = data.title;
  if (data.eventDate !== undefined) payload.eventDate = Timestamp.fromDate(data.eventDate);
  if (data.type !== undefined) payload.type = data.type;
  if (data.description !== undefined) payload.description = data.description;
  if (data.goals !== undefined) payload.goals = data.goals;
  await updateDoc(doc(db, EVENTS_COLLECTION, id), payload);
};

export const markEventNotified = async (
  id: string,
  threshold: number
): Promise<void> => {
  await updateDoc(doc(db, EVENTS_COLLECTION, id), {
    notifiedDays: arrayUnion(threshold),
    updatedAt: serverTimestamp(),
  });
};

export const deleteAthleteEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, EVENTS_COLLECTION, id));
};

export const subscribeToEventsByAthlete = (
  athleteId: string,
  callback: (events: AthleteEvent[]) => void
): (() => void) => {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where("athleteId", "==", athleteId)
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => docToEvent(d.id, d.data() as AthleteEventDocument))
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    callback(items);
  });
};

export const getAllEvents = async (): Promise<AthleteEvent[]> => {
  const snap = await getDocs(query(collection(db, EVENTS_COLLECTION), orderBy("eventDate", "asc")));
  return snap.docs.map((d) => docToEvent(d.id, d.data() as AthleteEventDocument));
};

export const getAthleteEventById = async (id: string): Promise<AthleteEvent | null> => {
  const snap = await getDoc(doc(db, EVENTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToEvent(snap.id, snap.data() as AthleteEventDocument);
};

export const getEventsByAthlete = async (athleteId: string): Promise<AthleteEvent[]> => {
  const q = query(collection(db, EVENTS_COLLECTION), where("athleteId", "==", athleteId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToEvent(d.id, d.data() as AthleteEventDocument))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
};
