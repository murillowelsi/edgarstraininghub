import type { TranslationsType } from "@/contexts/LanguageContext";

type ErrorTexts = Pick<TranslationsType, "errors">;

/** Firebase error code, without the "firestore/" prefix some SDK paths add. */
export const getErrorCode = (err: unknown): string | undefined => {
  if (typeof err === "object" && err !== null && "code" in err && typeof err.code === "string") {
    return err.code.replace(/^firestore\//, "");
  }
  return undefined;
};

/**
 * Human text for an error: what happened + what to do, never the raw Firebase
 * message (design system 8.4).
 */
export const getErrorMessage = (err: unknown, t: ErrorTexts): string => {
  const e = t.errors;
  switch (getErrorCode(err)) {
    case "permission-denied":
      return e.permissionDenied;
    case "unavailable":
    case "auth/network-request-failed":
      return e.offline;
    case "not-found":
      return e.notFound;
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return e.wrongCredentials;
    case "auth/email-already-in-use":
      return e.emailInUse;
    case "auth/too-many-requests":
      return e.tooManyRequests;
    default:
      return e.generic;
  }
};
