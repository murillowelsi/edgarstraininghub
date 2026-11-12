import { describe, expect, it } from "vitest";
import { getErrorCode, getErrorMessage } from "./errors";
import en from "@/translations/en.json";
import pt from "@/translations/pt.json";

const err = (code: string) => Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe("getErrorMessage", () => {
  it("maps sign-in failures to one human message", () => {
    for (const code of ["auth/wrong-password", "auth/invalid-credential", "auth/user-not-found"]) {
      expect(getErrorMessage(err(code), en)).toBe("Incorrect email or password.");
      expect(getErrorMessage(err(code), pt)).toBe("E-mail ou senha incorretos.");
    }
  });

  it("maps Firestore and network codes", () => {
    expect(getErrorMessage(err("permission-denied"), pt)).toBe(pt.errors.permissionDenied);
    expect(getErrorMessage(err("firestore/permission-denied"), pt)).toBe(pt.errors.permissionDenied);
    expect(getErrorMessage(err("unavailable"), en)).toBe(en.errors.offline);
    expect(getErrorMessage(err("auth/network-request-failed"), en)).toBe(en.errors.offline);
    expect(getErrorMessage(err("not-found"), en)).toBe(en.errors.notFound);
    expect(getErrorMessage(err("auth/too-many-requests"), en)).toBe(en.errors.tooManyRequests);
  });

  it("never returns the raw Firebase text", () => {
    expect(getErrorMessage(err("auth/internal-error"), en)).toBe(en.errors.generic);
    expect(getErrorMessage(new Error("boom"), en)).toBe(en.errors.generic);
    expect(getErrorMessage("x", pt)).toBe(pt.errors.generic);
    expect(getErrorCode(null)).toBeUndefined();
  });
});
