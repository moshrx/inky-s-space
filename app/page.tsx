import VisitLogger from "@/components/VisitLogger";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12 text-center">
      <VisitLogger />
      <p className="max-w-xl font-serif text-2xl font-light leading-relaxed text-ink-silver sm:text-3xl">
        this app really means a lot to me, taking it down hurts. take care and stay happy..
      </p>
    </main>
  );
}
