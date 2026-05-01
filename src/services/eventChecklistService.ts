import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  EventChecklist,
  EventChecklistPreset,
  EventChecklistSection,
} from "../types/eventChecklist";

const COLLECTION = "eventChecklists";

export const getEventChecklist = async (
  eventId: string
): Promise<EventChecklist | null> => {
  const ref = doc(db, COLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as {
    eventId: string;
    athleteId: string;
    preset?: EventChecklistPreset;
    sections?: EventChecklistSection[];
  };
  return {
    eventId: data.eventId,
    athleteId: data.athleteId,
    preset: data.preset,
    sections: data.sections || [],
  };
};

export const saveEventChecklist = async (
  eventId: string,
  athleteId: string,
  sections: EventChecklistSection[],
  preset?: EventChecklistPreset
): Promise<void> => {
  const ref = doc(db, COLLECTION, eventId);
  await setDoc(ref, {
    eventId,
    athleteId,
    preset: preset ?? null,
    sections,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEventChecklist = async (eventId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, eventId));
};
