import SentimentTracker from "@/components/SentimentTracker";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center gap-10 px-6 py-16">
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sentiment Tracker</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          Part of Sidequests — your gamified campus companion. Log how you&apos;re
          feeling and Gemini reflects it back to help you notice your patterns.
        </p>
      </div>
      <SentimentTracker />
    </main>
  );
}
