import { useEffect, useState } from "react";

// Shared by the corner digital meter and (eventually) any other display
// that wants the same reading — one sensor subscription, not one per
// component. Named for what it actually reads: phone orientation, not a
// calibrated distance or EMF value.
export function useHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSupported(false);
      return;
    }
    const handler = (event: DeviceOrientationEventInit & { webkitCompassHeading?: number }) => {
      const value = event.webkitCompassHeading ?? event.alpha ?? null;
      if (value !== null) setHeading(value);
    };
    window.addEventListener("deviceorientation", handler as EventListener);
    return () => window.removeEventListener("deviceorientation", handler as EventListener);
  }, [enabled]);

  return { heading, supported };
}
