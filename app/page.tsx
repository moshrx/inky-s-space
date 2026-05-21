import Image from "next/image";
import Link from "next/link";
import Starfield from "@/components/Starfield";

export default function Home() {
  return (
    <main className="vignette safe-px relative min-h-svh overflow-hidden">
      <Starfield density={0.18} />

      <div className="relative z-20 mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center px-5 py-10 text-center">
        <p className="fade-in-up mb-4 text-[9px] uppercase tracking-[0.35em] text-ink-mist opacity-0 [animation-delay:200ms] sm:mb-6 sm:text-[10px] sm:tracking-[0.4em]">
          a small space for poems
        </p>

        <h1 className="fade-in-up font-serif text-[2.75rem] font-light leading-[0.95] tracking-tight text-ink-silver opacity-0 [animation-delay:400ms] sm:text-6xl md:text-7xl lg:text-8xl">
          Inky&rsquo;s <span className="italic text-ink-gold">Space</span>
        </h1>

        <p className="fade-in-up mt-6 max-w-[18rem] font-serif text-sm italic leading-snug text-ink-mist opacity-0 [animation-delay:1000ms] sm:mt-8 sm:max-w-md sm:text-base md:text-lg">
          some things are easier to say
          <br />
          when the lights are out.
        </p>

        <div className="fade-in-up mt-8 opacity-0 [animation-delay:1300ms]">
          <Image
            src="/inky.jpg"
            alt="Inky"
            width={56}
            height={56}
            className="h-12 w-12 rounded-full border border-ink-gold/20 object-cover opacity-40 grayscale transition-all duration-500 hover:opacity-70 hover:grayscale-0 sm:h-14 sm:w-14"
            priority
          />
        </div>

        <div className="fade-in-up mt-10 flex flex-col items-center gap-4 opacity-0 [animation-delay:1600ms] sm:mt-14 sm:gap-6 md:flex-row md:gap-10">
          <Portal href="/inky" label="the writing room" sub="for inky" tone="gold" />
          <span className="hidden text-ink-faded md:inline">·</span>
          <Portal href="/space" label="the space" sub="for the reader" tone="silver" />
        </div>

        <p className="fade-in safe-bottom absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.3em] text-ink-faded opacity-0 [animation-delay:2400ms] sm:text-[10px] sm:tracking-[0.35em]">
          no likes · no counts · no metrics
        </p>
      </div>
    </main>
  );
}

function Portal({
  href,
  label,
  sub,
  tone,
}: {
  href: string;
  label: string;
  sub: string;
  tone: "gold" | "silver";
}) {
  const color = tone === "gold" ? "#f4d58d" : "#e8edf7";
  return (
    <Link href={href} className="group relative" prefetch>
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 backdrop-blur-sm transition-[transform,border-color] duration-300 ease-out group-hover:scale-[1.04] group-hover:border-white/25 group-active:scale-[0.98] sm:h-40 sm:w-40 md:h-44 md:w-44">
        <div
          className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle at center, ${color}22 0%, transparent 70%)` }}
        />
        <div className="absolute inset-2 rounded-full border border-white/5" />
        <div className="absolute inset-5 rounded-full border border-white/5" />
        <div className="relative text-center">
          <div className="font-serif text-base italic sm:text-lg md:text-xl" style={{ color }}>
            {label}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.25em] text-ink-mist sm:mt-1 sm:text-[10px] sm:tracking-[0.3em]">
            {sub}
          </div>
        </div>
      </div>
    </Link>
  );
}
