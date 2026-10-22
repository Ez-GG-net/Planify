import { CalendarDays } from "lucide-react";

//!TEMPORARY LOGO
export default function PlanifyLogo() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <CalendarDays aria-hidden="true" className="size-5" strokeWidth={2.1} />
    </span>
  );
}
