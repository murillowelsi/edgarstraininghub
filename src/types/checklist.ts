import type { Timestamp } from "firebase/firestore";
import type { WorkoutType } from "./workout";

export interface ChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}

export interface WorkoutChecklistTemplate {
  userId: string;
  type: WorkoutType;
  items: ChecklistItem[];
  updatedAt?: Date;
}

export interface WorkoutChecklistTemplateDocument {
  userId: string;
  type: WorkoutType;
  items: ChecklistItem[];
  updatedAt: Timestamp;
}

export interface WorkoutChecklistInstance {
  assignmentId: string;
  userId: string;
  items: ChecklistItem[];
  updatedAt?: Date;
}

export const generateChecklistItemId = (): string =>
  `cli_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const make = (labels: string[]): ChecklistItem[] =>
  labels.map((label) => ({ id: generateChecklistItemId(), label }));

export const defaultChecklistByType: Record<WorkoutType, () => ChecklistItem[]> = {
  running: () =>
    make([
      "Tênis de corrida",
      "Meias",
      "Roupa de corrida",
      "Garrafa de água",
      "Gel / nutrição",
      "Relógio carregado",
      "Cinta cardíaca",
      "Boné / viseira",
      "Protetor solar",
    ]),
  cycling: () =>
    make([
      "Bike revisada",
      "Capacete",
      "Sapatilha",
      "Câmara reserva",
      "Bomba / CO2",
      "Multitool",
      "Garrafas (água / isotônico)",
      "Óculos",
      "Luvas",
      "Gel / barra",
      "Celular carregado",
    ]),
  swimming: () =>
    make([
      "Sunga / maiô",
      "Touca",
      "Óculos de natação",
      "Toalha",
      "Chinelo",
      "Garrafa de água",
      "Pull buoy / palmar (se aplicável)",
    ]),
  strength: () =>
    make([
      "Roupa de treino",
      "Tênis",
      "Garrafa de água",
      "Toalha",
      "Luvas / strap (se usar)",
      "Fone de ouvido",
    ]),
};
