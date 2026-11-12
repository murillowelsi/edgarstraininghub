import type { UserRole } from "@/types/user";

/**
 * Last signed-in user's role, so a reload can render the app right away and
 * confirm the role from Firestore in the background. Stores only the uid and
 * the role (no personal data). Cleared on sign-out.
 */
export const ROLE_CACHE_KEY = "ez-role-cache-v1";
const ROLES: UserRole[] = ["admin", "editor", "athlete"];

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** The cached role, only when it belongs to this uid. */
export const getCachedRole = (uid: string): UserRole | null => {
  try {
    const raw = storage()?.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: unknown; role?: unknown };
    return parsed.uid === uid && ROLES.includes(parsed.role as UserRole) ? (parsed.role as UserRole) : null;
  } catch {
    return null;
  }
};

export const setCachedRole = (uid: string, role: UserRole | null): void => {
  if (!role) return clearCachedRole();
  storage()?.setItem(ROLE_CACHE_KEY, JSON.stringify({ uid, role }));
};

export const clearCachedRole = (): void => {
  storage()?.removeItem(ROLE_CACHE_KEY);
};
