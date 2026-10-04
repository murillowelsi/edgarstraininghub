import type { Timestamp } from "firebase/firestore";

export interface EventChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}

export type EventChecklistCategory =
  | "docs"
  | "running"
  | "cycling"
  | "swimming"
  | "transition"
  | "post"
  | "custom";

export interface EventChecklistSection {
  id: string;
  title: string;
  category?: EventChecklistCategory;
  items: EventChecklistItem[];
}

export interface EventChecklist {
  eventId: string;
  athleteId: string;
  preset?: EventChecklistPreset;
  sections: EventChecklistSection[];
  updatedAt?: Date;
}

export interface EventChecklistDocument {
  eventId: string;
  athleteId: string;
  preset?: EventChecklistPreset;
  sections: EventChecklistSection[];
  updatedAt: Timestamp;
}

export type EventChecklistPreset =
  | "running"
  | "cycling"
  | "swimming"
  | "triathlon-sprint"
  | "triathlon-long"
  | "blank";

export const generateId = (): string =>
  `eci_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/** Section titles and item labels for the active language, supplied by the caller. */
export interface EventChecklistStrings {
  sections: Record<"docs" | "running" | "cycling" | "swimming" | "transition" | "post", string>;
  items: {
    docs: readonly string[];
    running: readonly string[];
    cycling: readonly string[];
    swimming: readonly string[];
    transition: readonly string[];
    post: readonly string[];
    longBike: readonly string[];
    longRun: readonly string[];
  };
}

const mkItems = (labels: readonly string[]): EventChecklistItem[] =>
  labels.map((label) => ({ id: generateId(), label, checked: false }));

const mkSection = (
  title: string,
  category: EventChecklistCategory,
  labels: readonly string[]
): EventChecklistSection => ({
  id: generateId(),
  title,
  category,
  items: mkItems(labels),
});

/**
 * Build the sections for a preset in the caller's active language. Sections are
 * persisted on save, so an existing checklist keeps the wording it was created with.
 */
export const buildEventChecklistPreset = (
  preset: EventChecklistPreset,
  s: EventChecklistStrings
): EventChecklistSection[] => {
  const docs = () => mkSection(s.sections.docs, "docs", s.items.docs);
  const run = () => mkSection(s.sections.running, "running", s.items.running);
  const bike = () => mkSection(s.sections.cycling, "cycling", s.items.cycling);
  const swim = () => mkSection(s.sections.swimming, "swimming", s.items.swimming);
  const transition = () => mkSection(s.sections.transition, "transition", s.items.transition);
  const post = () => mkSection(s.sections.post, "post", s.items.post);

  switch (preset) {
    case "running":
      return [docs(), run(), post()];
    case "cycling":
      return [docs(), bike(), post()];
    case "swimming":
      return [docs(), swim(), post()];
    case "triathlon-sprint":
      return [docs(), swim(), bike(), run(), transition(), post()];
    case "triathlon-long": {
      const sections = [docs(), swim(), bike(), run(), transition(), post()];
      // Long distance carries extra kit on the bike and run legs.
      sections[2].items.push(...mkItems(s.items.longBike));
      sections[3].items.push(...mkItems(s.items.longRun));
      return sections;
    }
    case "blank":
    default:
      return [];
  }
};
