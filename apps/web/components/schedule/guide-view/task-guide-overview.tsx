export function TaskGuideOverview({
  description,
  objective,
}: {
  description: string
  objective: string
}) {
  return (
    <section className="space-y-4">
      <p className="text-muted-foreground">
        {description}
      </p>

      <div className="rounded-xl border bg-muted/40 p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Objective
        </p>

        <p className="text-sm leading-6">
          {objective}
        </p>
      </div>
    </section>
  )
}