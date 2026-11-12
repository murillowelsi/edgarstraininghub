const PHONE = "+351962869476";

const MESSAGES = {
  pt: "Olá! Estou interessado(a) em saber mais sobre os seus serviços de personal training.",
  en: "Hello! I'm interested in learning more about your personal training services.",
} as const;

/**
 * WhatsApp link with the pre-filled message (one place for the hero, contact and plans).
 * With `planMessage`, that text is sent instead (e.g. "I'm interested in the Standard Plan").
 */
export const getWhatsAppLink = (language: "pt" | "en", planMessage?: string): string =>
  `https://wa.me/${PHONE}?text=${encodeURIComponent(planMessage ?? MESSAGES[language] ?? MESSAGES.en)}`;
