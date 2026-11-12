import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FCMService } from "@/services/fcm";
import {
  isOptedOut,
  pushState,
  pushSupport,
  readEnvironment,
  setOptedOut,
  type Permission,
  type PushState,
  type PushSupport,
} from "@/lib/pushSupport";

const CHANGE_EVENT = "ez:push-change";

const currentPermission = (): Permission =>
  typeof Notification === "undefined" ? "default" : (Notification.permission as Permission);

/**
 * Push on/off for this device. The permission is only ever requested from a
 * tap (enable()), never on load. State is shared by every component using it.
 */
export function usePush(): {
  state: PushState;
  support: PushSupport;
  busy: boolean;
  isIOSDevice: boolean;
  enable: () => Promise<PushState>;
  disable: () => Promise<void>;
} {
  const { user } = useAuth();
  const env = useMemo(readEnvironment, []);
  const support = pushSupport(env);
  const [permission, setPermission] = useState<Permission>(currentPermission);
  const [optedOut, setOpt] = useState(() => (user ? isOptedOut(user.uid) : false));
  const [busy, setBusy] = useState(false);

  // Re-read when another screen changes it, or when coming back from Settings
  useEffect(() => {
    const refresh = () => {
      setPermission(currentPermission());
      setOpt(user ? isOptedOut(user.uid) : false);
    };
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user]);

  const enable = useCallback(async (): Promise<PushState> => {
    if (!user || support !== "supported") return pushState(support, permission, optedOut);
    // iOS: requestPermission must be the first thing awaited inside the tap
    let perm = currentPermission();
    if (perm === "default") perm = (await Notification.requestPermission()) as Permission;
    setPermission(perm);
    if (perm !== "granted") {
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return pushState(support, perm, optedOut);
    }
    setOptedOut(user.uid, false);
    setOpt(false);
    setBusy(true);
    try {
      await FCMService.registerToken(user.uid);
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
    return "on";
  }, [user, support, permission, optedOut]);

  const disable = useCallback(async () => {
    if (!user) return;
    setOptedOut(user.uid, true);
    setOpt(true);
    setBusy(true);
    try {
      await FCMService.unregisterToken(user.uid);
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, [user]);

  return {
    state: pushState(support, permission, optedOut),
    support,
    busy,
    isIOSDevice: support === "ios-needs-install" || /iPhone|iPad|iPod/i.test(env.userAgent),
    enable,
    disable,
  };
}

/**
 * On app start (athlete and coach layouts): refresh this device's token if
 * push is already allowed and not turned off here. Never asks for permission.
 */
export function usePushBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    if (pushSupport(readEnvironment()) !== "supported") return;
    if (currentPermission() !== "granted" || isOptedOut(user.uid)) return;
    FCMService.registerToken(user.uid).catch(() => {});
  }, [user]);
}
