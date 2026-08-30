"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fires one fire-and-forget ping per page view. Renders nothing, shows
// nothing, blocks nothing — but it is a normal network request to a
// first-party path, visible in devtools like any other. It is unobtrusive,
// not concealed: no beacon-hiding, no obfuscated endpoint name.

export default function VisitLogger() {
  const pathname = usePathname();

  useEffect(() => {
    // The Navigation Timing API tells us whether this was a fresh arrival or
    // a refresh, without needing a cookie or stored id to infer it.
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const kind = nav?.type === "reload" ? "reload" : "load";

    const payload = JSON.stringify({
      path: pathname,
      kind,
      referrer: document.referrer,
    });

    // keepalive so the request survives the visitor navigating away
    // immediately; .catch so an offline visitor never sees a console error.
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
