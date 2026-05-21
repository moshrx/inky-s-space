"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Poem, Echo, Emotion } from "@/types/poem";
import { uid, emptyPoem, placeStar, dbToPoem, poemToDb, dbToEcho, echoToDb } from "./storage";
import { createClient, type AnyClient } from "./supabase/client";

let client: AnyClient | null = null;

function getClient(): AnyClient {
  client ??= createClient();
  return client;
}

function fire(promise: PromiseLike<unknown>, label: string) {
  Promise.resolve(promise).catch((err: unknown) => console.error(label, err));
}

export function usePoems() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [ready, setReady] = useState(false);
  const drafts = useMemo(() => poems.filter((p) => p.publishedAt === null), [poems]);
  const published = useMemo(() => poems.filter((p) => p.publishedAt !== null), [poems]);

  // Load once on mount. Anon key reads everything per RLS.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getClient();
        const [{ data: poemsData, error: pErr }, { data: echoesData, error: eErr }] =
          await Promise.all([
            supabase.from("poems").select("*").order("created_at", { ascending: false }),
            supabase.from("echoes").select("*").order("created_at", { ascending: false }),
          ]);

        if (cancelled) return;
        if (pErr) console.error("load poems error:", pErr);
        if (eErr) console.error("load echoes error:", eErr);

        setPoems((poemsData ?? []).map((row) => dbToPoem(row as Record<string, unknown>)));
        setEchoes((echoesData ?? []).map((row) => dbToEcho(row as Record<string, unknown>)));
      } catch (err) {
        if (!cancelled) console.error("load poems failed:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const createDraft = useCallback((emotion: Emotion = "quiet") => {
    const draft = emptyPoem(emotion);
    setPoems((prev) => [draft, ...prev]);
    fire(
      getClient().from("poems").insert(poemToDb(draft)),
      "createDraft error:",
    );
    return draft;
  }, []);

  const updatePoem = useCallback(
    (id: string, patch: Partial<Poem>) => {
      setPoems((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
        );
        const updated = next.find((p) => p.id === id);
        if (updated) {
          fire(
            getClient().from("poems").update(poemToDb(updated)).eq("id", id),
            "updatePoem error:",
          );
        }
        return next;
      });
    },
    [],
  );

  const deletePoem = useCallback(
    (id: string) => {
      setPoems((prev) => prev.filter((p) => p.id !== id));
      setEchoes((prev) => prev.filter((e) => e.poemId !== id));
      // echoes cascade via FK, but we also remove client-side
      fire(
        getClient().from("poems").delete().eq("id", id),
        "deletePoem error:",
      );
    },
    [],
  );

  const publish = useCallback(
    (id: string) => {
      setPoems((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          const pos =
            p.x !== undefined ? { x: p.x, y: p.y, depth: p.depth } : placeStar(p.id);
          return { ...p, publishedAt: Date.now(), ...pos };
        });
        const updated = next.find((p) => p.id === id);
        if (updated) {
          fire(
            getClient().from("poems").update(poemToDb(updated)).eq("id", id),
            "publish error:",
          );
        }
        return next;
      });
    },
    [],
  );

  const unpublish = useCallback(
    (id: string) => {
      setPoems((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, publishedAt: null } : p,
        );
        const updated = next.find((p) => p.id === id);
        if (updated) {
          fire(
            getClient().from("poems").update(poemToDb(updated)).eq("id", id),
            "unpublish error:",
          );
        }
        return next;
      });
    },
    [],
  );

  const addEcho = useCallback(
    (poemId: string, text: string) => {
      const echo: Echo = {
        id: uid(),
        poemId,
        text: text.trim().slice(0, 240),
        createdAt: Date.now(),
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 30,
      };
      setEchoes((prev) => [...prev, echo]);
      fire(
        getClient().from("echoes").insert(echoToDb(echo)),
        "addEcho error:",
      );
    },
    [],
  );

  return {
    ready,
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
