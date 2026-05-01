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

export const eventPresetLabels: Record<EventChecklistPreset, string> = {
  running: "Prova de corrida",
  cycling: "Prova de ciclismo",
  swimming: "Prova / travessia de natação",
  "triathlon-sprint": "Triatlo Sprint / Olímpico",
  "triathlon-long": "Triatlo 70.3 / Ironman",
  blank: "Em branco",
};

export const generateId = (): string =>
  `eci_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const mkItems = (labels: string[]): EventChecklistItem[] =>
  labels.map((label) => ({ id: generateId(), label, checked: false }));

const mkSection = (
  title: string,
  category: EventChecklistCategory,
  labels: string[]
): EventChecklistSection => ({
  id: generateId(),
  title,
  category,
  items: mkItems(labels),
});

const docs = () =>
  mkSection("Documentação", "docs", [
    "RG / documento com foto",
    "Confirmação de inscrição",
    "Kit do atleta / numeração",
    "Chip de cronometragem",
    "Atestado médico (se exigido)",
    "Cartão de saúde / seguro",
  ]);

const runItems = () =>
  mkSection("Corrida", "running", [
    "Tênis de prova",
    "Meias",
    "Roupa de corrida",
    "Boné / viseira",
    "Óculos",
    "Relógio carregado",
    "Cinta cardíaca",
    "Géis / nutrição",
    "Sal / cápsulas",
    "Protetor solar",
    "Vaselina / body glide",
  ]);

const bikeItems = () =>
  mkSection("Ciclismo", "cycling", [
    "Bike revisada",
    "Capacete",
    "Sapatilha",
    "Câmara reserva (x2)",
    "Bomba / CO2",
    "Multitool",
    "Garrafas (água / isotônico)",
    "Géis / barras",
    "Óculos",
    "Luvas",
    "Roupa de bike / macaquinho",
  ]);

const swimItems = () =>
  mkSection("Natação", "swimming", [
    "Wetsuit (se permitido)",
    "Touca da prova",
    "Touca extra",
    "Óculos de natação",
    "Óculos extra",
    "Body glide / vaselina",
    "Roupa de prova / trisuit",
  ]);

const transitionItems = () =>
  mkSection("Transição", "transition", [
    "Mochila / caixa de transição",
    "Toalha",
    "Talco",
    "Elástico de cadarço",
    "Garrafa para enxaguar pés",
    "Saco para roupa molhada",
  ]);

const postRace = () =>
  mkSection("Pós-prova", "post", [
    "Roupa seca",
    "Chinelo",
    "Recovery / shake",
    "Água / isotônico extra",
    "Dinheiro / cartão",
    "Carregador / power bank",
    "Sacola para lixo",
  ]);

export const eventChecklistPresets: Record<EventChecklistPreset, () => EventChecklistSection[]> = {
  running: () => [docs(), runItems(), postRace()],
  cycling: () => [docs(), bikeItems(), postRace()],
  swimming: () => [docs(), swimItems(), postRace()],
  "triathlon-sprint": () => [docs(), swimItems(), bikeItems(), runItems(), transitionItems(), postRace()],
  "triathlon-long": () => {
    const sections = [docs(), swimItems(), bikeItems(), runItems(), transitionItems(), postRace()];
    // For long distance, append extra items where it matters
    sections[2].items.push(
      { id: generateId(), label: "Special needs bike (sacola)", checked: false },
      { id: generateId(), label: "Aerobar / hidratação na bike", checked: false }
    );
    sections[3].items.push(
      { id: generateId(), label: "Special needs corrida (sacola)", checked: false },
      { id: generateId(), label: "Lanterna / headlamp (se anoitecer)", checked: false }
    );
    return sections;
  },
  blank: () => [],
};
