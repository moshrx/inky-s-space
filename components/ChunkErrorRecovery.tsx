"use client";

import { useEffect } from "react";

const RELOAD_KEY = "inky:chunk-reload";

export default function ChunkErrorRecovery() {
  useEffect(() => {
    const clearReloadFlag = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(RELOAD_KEY);
      } catch {}
    }, 5000);

    function recover() {
      try {
        if (window.sessionStorage.getItem(RELOAD_KEY) === "1") return;
        window.sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {}
      window.location.reload();
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (isChunkFailure(event.reason)) recover();
    }

    function onError(event: ErrorEvent | Event) {
      if ("error" in event && isChunkFailure(event.error)) {
        recover();
        return;
      }
      if ("message" in event && isChunkFailure(event.message)) {
        recover();
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const url =
        target instanceof HTMLScriptElement
          ? target.src
          : target instanceof HTMLLinkElement
            ? target.href
            : "";

      if (url.includes("/_next/static/")) recover();
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError, true);

    return () => {
      window.clearTimeout(clearReloadFlag);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}

function isChunkFailure(reason: unknown) {
  const message =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
        ? reason
        : "";

  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
}
