"use client";

import { useCallback, useEffect, useState } from "react";

// The visit log, read-only. The password is held in component state and sent
// as a header on each request; it is never written to localStorage, because
// unlike the /inky unlock flag this value is the actual secret.

const STAT_LABELS: Record<string, string> = {
  visitors: "visitors",
  views: "views",
  visitors_24h: "visitors · 24h",
  views_24h: "views · 24h",
  reloads: "reloads",
};

interface Row {
  [key: string]: string | number | null;
}

interface Stats {
  totals: Record<string, number>;
  daily: Row[];
  paths: Row[];
  referrers: Row[];
  devices: Row[];
  countries: Row[];
  visitors: Row[];
}

export default function VisitsPage() {
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/visits", { headers: { "x-stats-password": pw } });
      if (!res.ok) {
        setError(res.status === 404 ? "wrong password" : "could not load");
        setStats(null);
        return;
      }
      setStats(await res.json());
      setPassword(pw);
    } catch {
      setError("could not load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on focus so the page is current when you come back to the tab.
  useEffect(() => {
    if (!password) return;
    const onFocus = () => load(password);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [password, load]);

  if (!stats) {
    return (
      <main className="flex min-h-svh items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(input);
          }}
          className="flex w-full max-w-xs flex-col gap-3 text-center"
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-ink-mist">
            who has been here
          </p>
          <input
            type="password"
            value={input}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
            placeholder="the password"
            className="rounded-full border border-white/15 bg-white/[0.02] px-5 py-3 text-center font-serif text-base italic text-ink-silver placeholder:text-ink-faded focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input || loading}
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-ink-silver transition-all hover:border-ink-gold hover:text-ink-gold active:scale-95 disabled:opacity-30"
          >
            {loading ? "…" : "✦ open"}
          </button>
          {error && <p className="text-xs italic text-red-400/80">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="safe-px mx-auto min-h-svh max-w-5xl px-6 py-14">
      <header className="mb-10 flex items-baseline justify-between">
        <h1 className="font-serif text-3xl font-light italic text-ink-silver">
          who has been here
        </h1>
        <a
          href="/inky"
          className="text-[10px] uppercase tracking-[0.3em] text-ink-faded transition-colors hover:text-ink-mist"
        >
          ← the writing room
        </a>
      </header>

      <section className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(STAT_LABELS).map(([key, label]) => (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-5 text-center"
          >
            <div className="font-serif text-3xl font-light text-ink-silver">
              {stats.totals?.[key] ?? 0}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-faded">
              {label}
            </div>
          </div>
        ))}
      </section>

      <Table
        title="visit log"
        note="Malaysia visits only. repeated visits from the same device stay visible."
        head={["time", "id", "path", "kind", "source", "device", "country"]}
        rows={stats.visitors.map((v) => [
          v.seen_at,
          v.id,
          v.path,
          v.kind,
          v.source,
          v.device,
          v.country || "—",
        ])}
      />

      <Table
        title="by day"
        head={["day", "visitors", "views"]}
        rows={stats.daily.map((d) => [d.day, d.visitors, d.views])}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <Table
          title="pages"
          head={["path", "visitors", "views"]}
          rows={stats.paths.map((p) => [p.path, p.visitors, p.views])}
        />
        <Table
          title="came from"
          head={["source", "views"]}
          rows={stats.referrers.map((r) => [r.source, r.views])}
        />
        <Table
          title="devices"
          head={["device", "views"]}
          rows={stats.devices.map((d) => [d.device, d.views])}
        />
        <Table
          title="countries"
          head={["country", "views"]}
          rows={stats.countries.map((c) => [c.country, c.views])}
        />
      </div>
    </main>
  );
}

function Table({
  title,
  note,
  head,
  rows,
}: {
  title: string;
  note?: string;
  head: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-1 text-[10px] uppercase tracking-[0.3em] text-ink-mist">
        {title}
      </h2>
      {note && <p className="mb-3 font-serif text-xs italic text-ink-faded">{note}</p>}
      {rows.length === 0 ? (
        <p className="font-serif text-sm italic text-ink-faded">nothing yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.2em] text-ink-faded">
                {head.map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2.5 text-ink-silver ${
                        j === 0 ? "font-mono text-xs text-ink-mist" : ""
                      }`}
                    >
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
