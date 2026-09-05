import { useEffect, useState } from "react";

type PermissionState = "unnecessary" | "prompt" | "granted" | "denied";

// iOS 13+ Safari refuses to fire deviceorientation events at all until the
// page calls DeviceOrientationEvent.requestPermission() from inside a real
// tap — passively adding a listener (which is all Android/desktop need)
// silently does nothing on iPhone. This hook exposes that gap as state so
// the UI can ask for the tap instead of just showing a dead reading.
export function useHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<PermissionState>("unnecessary");

  const needsIOSPermission =
    typeof window !== "undefined" &&
    typeof (window as any).DeviceOrientationEvent?.requestPermission === "function";

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSupported(false);
      return;
    }
    if (needsIOSPermission) {
      setPermission((prev) => (prev === "granted" ? prev : "prompt"));
      return;
    }

    const handler = (event: DeviceOrientationEventInit & { webkitCompassHeading?: number }) => {
      const value = event.webkitCompassHeading ?? event.alpha ?? null;
      if (value !== null) setHeading(value);
    };
    window.addEventListener("deviceorientation", handler as EventListener);
    return () => window.removeEventListener("deviceorientation", handler as EventListener);
  }, [enabled, needsIOSPermission]);

  // Must be called directly from a click/tap handler — iOS only honors
  // the permission request when it's part of the same user gesture.
  async function requestPermission() {
    const api = (window as any).DeviceOrientationEvent;
    if (!api?.requestPermission) return;
    try {
      const result: PermissionState = await api.requestPermission();
      setPermission(result);
      if (result === "granted") {
        const handler = (event: DeviceOrientationEventInit & { webkitCompassHeading?: number }) => {
          const value = event.webkitCompassHeading ?? event.alpha ?? null;
          if (value !== null) setHeading(value);
        };
        window.addEventListener("deviceorientation", handler as EventListener);
      }
    } catch {
      setPermission("denied");
    }
  }

  return { heading, supported, permission, needsIOSPermission, requestPermission };
}
