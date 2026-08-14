"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Poem, Echo } from "@/types/poem";
import { uid, emptyPoem, placeStar, dbToPoem, poemToDb, dbToEcho, echoToDb } from "./storage";

// Data goes through /api/* (direct Postgres) rather than the Supabase JS
// client, because PostgREST can fail independently of the database.

function fire(promise: Promise<Response>, label: string) {
  promise
    .then((res) => {
      if (!res.ok) console.error(label, res.status, res.statusText);
    })
    .catch((err: unknown) => console.error(label, err));
}

function post(url: string, body: unknown, method = "POST") {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function usePoems() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [ready, setReady] = useState(false);
  // Distinguishes "nothing written yet" from "we couldn't reach the data".
  // Without this a total outage renders as an empty sky, which is what made
  // the PostgREST failure look like missing content.
  const [error, setError] = useState<string | null>(null);
  const drafts = useMemo(() => poems.filter((p) => p.publishedAt === null), [poems]);
  const published = useMemo(() => poems.filter((p) => p.publishedAt !== null), [poems]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/poems", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const { poems: poemsData, echoes: echoesData } = await res.json();

        if (cancelled) return;
        setPoems((poemsData ?? []).map((row: Record<string, unknown>) => dbToPoem(row)));
        setEchoes((echoesData ?? []).map((row: Record<string, unknown>) => dbToEcho(row)));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error("load poems failed:", err);
          setError("Couldn't reach the poems right now.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const createDraft = useCallback(() => {
    const draft = emptyPoem();
    setPoems((prev) => [draft, ...prev]);
    fire(post("/api/poems", poemToDb(draft)), "createDraft error:");
    return draft;
  }, []);

  const updatePoem = useCallback((id: string, patch: Partial<Poem>) => {
    setPoems((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
      );
      const updated = next.find((p) => p.id === id);
      if (updated) {
        fire(post("/api/poems", poemToDb(updated), "PATCH"), "updatePoem error:");
      }
      return next;
    });
  }, []);

  const deletePoem = useCallback((id: string) => {
    setPoems((prev) => prev.filter((p) => p.id !== id));
    setEchoes((prev) => prev.filter((e) => e.poemId !== id));
    // echoes cascade via FK, but we also remove client-side
    fire(
      fetch(`/api/poems?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
      "deletePoem error:",
    );
  }, []);

  const publish = useCallback((id: string) => {
    setPoems((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const now = Date.now();
        // Always reseat the star into its week-cluster so a poem published
        // long after it was drafted lands with its week-mates, not in
        // whatever empty corner an old computation chose.
        const pos = placeStar(p.id, now);
        return { ...p, publishedAt: now, ...pos };
      });
      const updated = next.find((p) => p.id === id);
      if (updated) {
        fire(post("/api/poems", poemToDb(updated), "PATCH"), "publish error:");
      }
      return next;
    });
  }, []);

  const unpublish = useCallback((id: string) => {
    setPoems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, publishedAt: null } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) {
        fire(post("/api/poems", poemToDb(updated), "PATCH"), "unpublish error:");
      }
      return next;
    });
  }, []);

  const addEcho = useCallback((poemId: string, text: string) => {
    const echo: Echo = {
      id: uid(),
      poemId,
      text: text.trim().slice(0, 240),
      createdAt: Date.now(),
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 30,
    };
    setEchoes((prev) => [...prev, echo]);
    fire(post("/api/echoes", echoToDb(echo)), "addEcho error:");
  }, []);

  return {
    ready,
    error,
    poems,
    echoes,
    drafts,
    published,
    createDraft,
    updatePoem,
    deletePoem,
    publish,
    unpublish,
    addEcho,
  };
}
