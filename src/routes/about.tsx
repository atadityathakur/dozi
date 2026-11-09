import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { PetCompanion } from "@/components/pets/pet-companion";
import { Button } from "@/components/ui/button";
import { useApp } from "@/state/app-store";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Dozi" },
      { name: "description", content: "Dozi is a cozy study-with-me room: a focus timer, lo-fi music, rain and a little companion who studies with you." },
      { property: "og:title", content: "About Dozi" },
      { property: "og:description", content: "Why Dozi exists and how to get the most out of your study sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const TIPS = [
  { title: "Pick a timer", body: "Pomodoro (25/5) for quick wins, Deep Focus (50/10) for real work, Long Study (90/15) for marathon days." },
  { title: "Set the mood", body: "Put on lo-fi and layer some rain or a fireplace. Your mix is saved for next time." },
  { title: "Study together", body: "Your companion puts on glasses while you focus, stretches on breaks and celebrates every finished session." },
  { title: "Watch it grow", body: "Every session earns focus points, builds your streak and unlocks little badges." },
];

function AboutPage() {
  const petId = useApp((s) => s.settings.pet);
  const name = useApp((s) => s.settings.companionName);
  return (
    <main className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6">
      <PageHeader eyebrow="About" title="A cozy room to focus in" />
      <section className="surface grid items-center gap-6 p-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-3 text-muted-foreground">
          <p>
            Dozi is a calm place to sit down and study. Start a timer, put on some music, and let {name} keep you company
            while the rain taps on the window.
          </p>
          <p>Everything stays on this device — no account, no sign-up. Your sessions, sounds and settings are saved automatically.</p>
          <Button asChild variant="hero" className="mt-2">
            <Link to="/">Go to the study room</Link>
          </Button>
        </div>
        <div className="mx-auto h-52 w-52">
          <PetCompanion petId={petId || "cat-white"} mood="idle" standalone label={`${name} your companion`} />
        </div>
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TIPS.map((t) => (
          <section key={t.title} className="surface p-5">
            <h2 className="font-display text-xl text-foreground">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
