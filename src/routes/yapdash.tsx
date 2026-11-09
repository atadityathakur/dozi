import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { YapDashApp } from "@/yapdash/YapDashApp";

export const Route = createFileRoute("/yapdash")({
  head: () => ({
    meta: [
      { title: "YapDash — Live Quiz Rooms" },
      { name: "description", content: "Build a quiz, share a six-digit code, and play together live." },
    ],
  }),
  component: YapDashRoute,
});

function YapDashRoute() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <YapDashApp onBackToDozi={() => navigate({ to: "/" })} />
    </div>
  );
}
