import { Card, CardContent } from "@/components/ui/card";

type Schedule = {
  id: string;
  title: string;
};

const schedules: Schedule[] = [
  { id: "1", title: "School Week" },
  { id: "2", title: "Work Shift" },
  { id: "3", title: "Gym Plan" },
  { id: "4", title: "Trip Schedule" },
  { id: "5", title: "Study Block" },
  { id: "6", title: "Weekend Tasks" },
];

export default function ScheduleDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Planify</h1>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-6">
        <section>
          <h2 className="mb-4 text-lg font-medium tracking-tight">
            Recent Schedules
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
              >
                <CardContent className="flex min-h-28 items-center p-5">
                  <p className="text-base font-medium">{schedule.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}