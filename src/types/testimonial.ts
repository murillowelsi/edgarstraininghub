import type { Timestamp } from "firebase/firestore";

export type TestimonialSource = "athlete" | "manual";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  stars: number;
  photoURL?: string;
  source: TestimonialSource;
  athleteId?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialDocument {
  name: string;
  role: string;
  text: string;
  stars: number;
  photoURL?: string;
  source: TestimonialSource;
  athleteId?: string;
  approved: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestimonialFormData {
  name: string;
  role: string;
  text: string;
  stars: number;
  photoURL?: string;
}
