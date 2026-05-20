import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  Testimonial,
  TestimonialDocument,
  TestimonialFormData,
} from "../types/testimonial";

const COLLECTION = "testimonials";

const docToTestimonial = (id: string, data: TestimonialDocument): Testimonial => ({
  id,
  name: data.name,
  role: data.role,
  text: data.text,
  stars: data.stars,
  photoURL: data.photoURL,
  source: data.source,
  athleteId: data.athleteId,
  approved: data.approved,
  createdAt: data.createdAt?.toDate() ?? new Date(),
  updatedAt: data.updatedAt?.toDate() ?? new Date(),
});

export const submitAthleteTestimonial = async (
  athleteId: string,
  athleteName: string,
  athletePhotoURL: string | undefined,
  data: { role: string; text: string; stars: number },
): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    name: athleteName,
    role: data.role,
    text: data.text,
    stars: data.stars,
    photoURL: athletePhotoURL ?? null,
    source: "athlete",
    athleteId,
    approved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateAthleteTestimonial = async (
  testimonialId: string,
  data: { role: string; text: string; stars: number },
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, testimonialId), {
    role: data.role,
    text: data.text,
    stars: data.stars,
    approved: false,
    updatedAt: serverTimestamp(),
  });
};

export const createManualTestimonial = async (
  data: TestimonialFormData,
): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    name: data.name,
    role: data.role,
    text: data.text,
    stars: data.stars,
    photoURL: data.photoURL ?? null,
    source: "manual",
    approved: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTestimonial = async (
  id: string,
  data: Partial<TestimonialFormData> & { approved?: boolean },
): Promise<void> => {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) payload.name = data.name;
  if (data.role !== undefined) payload.role = data.role;
  if (data.text !== undefined) payload.text = data.text;
  if (data.stars !== undefined) payload.stars = data.stars;
  if (data.photoURL !== undefined) payload.photoURL = data.photoURL ?? null;
  if (data.approved !== undefined) payload.approved = data.approved;
  await updateDoc(doc(db, COLLECTION, id), payload);
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const subscribeToAllTestimonials = (
  callback: (items: Testimonial[]) => void,
): (() => void) => {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) =>
        docToTestimonial(d.id, d.data() as TestimonialDocument),
      ),
    );
  });
};

export const getApprovedTestimonials = async (): Promise<Testimonial[]> => {
  const q = query(collection(db, COLLECTION), where("approved", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToTestimonial(d.id, d.data() as TestimonialDocument))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getTestimonialByAthlete = async (
  athleteId: string,
): Promise<Testimonial | null> => {
  const q = query(
    collection(db, COLLECTION),
    where("athleteId", "==", athleteId),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToTestimonial(d.id, d.data() as TestimonialDocument);
};
