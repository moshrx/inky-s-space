"use client";

import { useEffect, useState } from "react";
import Starfield from "@/components/Starfield";

// Change this in one place to rotate the password.
const INKY_PASSWORD = "canteloupe";
const STORAGE_KEY = "inky:unlocked";

interface Props {
  children: React.ReactNode;
}

export default function InkyLock({ children }: Props) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null); // null = checking
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setUnlocked(stored === "1");
    } catch {
      setUnlocked(false);
    }
  }, []);

  function attempt(e: React.FormEvent) {
    e.preventDefault();
    if (input === INKY_PASSWORD) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* private mode — session-only unlock */
      }
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 600);
    }
  }

  // Avoid a flash of the lock screen while we read localStorage
  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <main className="vignette safe-px relative min-h-svh overflow-hidden">
      <Starfield density={0.15} shooting={false} />

      <div className="relative z-20 mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="fade-in-up mb-4 text-[10px] uppercase tracking-[0.4em] text-ink-mist opacity-0 [animation-delay:200ms]">
          a closed door
        </p>

        <h1 className="fade-in-up font-serif text-4xl font-light italic text-ink-silver opacity-0 [animation-delay:400ms] sm:text-5xl">
          the writing room
        </h1>

        <p className="fade-in-up mt-5 max-w-xs font-serif text-base italic text-ink-mist opacity-0 [animation-delay:800ms]">
          only inky writes here.
          <br />
          if you are inky, the room remembers your word.
        </p>

        <form
          onSubmit={attempt}
          className="fade-in-up mt-10 flex w-full max-w-xs flex-col items-stretch gap-3 opacity-0 [animation-delay:1200ms]"
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder="the password"
            className={`rounded-full border bg-white/[0.02] px-5 py-3 text-center font-serif text-base italic text-ink-silver placeholder:text-ink-faded focus:outline-none ${
              error
                ? "shake border-red-400/60"
                : "border-white/15 focus:border-white/30"
            }`}
          />
          <button
            type="submit"
            disabled={!input}
            className="rounded-full border border-white/20 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-ink-silver transition-all hover:border-ink-gold hover:text-ink-gold active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ✦ open
          </button>
        </form>

        <a
          href="/space"
          className="fade-in mt-10 text-[10px] uppercase tracking-[0.3em] text-ink-faded opacity-0 transition-colors [animation-delay:2000ms] hover:text-ink-mist"
        >
          ← wander the space instead
        </a>
      </div>
    </main>
  );
}
