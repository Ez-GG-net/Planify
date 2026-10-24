import { CalendarCheck, CircleCheckBig, Goal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Set a goal",
    description:
      "Define your objective you want to achieve.",
    Icon: Goal,
  },
  {
    number: "02",
    title: "Build your plan",
    description:
      "Turn your goal into an organized schedule with structured tasks.",
    Icon: CalendarCheck,
  },
  {
    number: "03",
    title: "Make progress",
    description:
      "Consistently follow your plan, track your progress, and adjust as your priorities change.",
    Icon: CircleCheckBig,
  },
];

/**
 * "How it works" section. Server component: Card and Badge render plain
 * elements and hold no client state.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pb-24 sm:px-8 lg:pb-32"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          id="how-it-works-heading"
          className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Have a goal in mind? Turn it into a plan.
        </h2>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">
          Whether you're managing schoolwork, planning for a trip, or
          working toward a long-term goal, Planify helps you create a step-by-step plan that works for you.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
        {steps.map(({ number, title, description, Icon }) => (
          <Card key={number} className="transition-colors bg-bg">
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden className="size-5" strokeWidth={1.9} />
              </span>
              <CardAction>
                <Badge variant="secondary" className="tabular-nums">
                  {number}
                </Badge>
              </CardAction>
              <CardTitle className="mt-2 text-lg">{title}</CardTitle>
              <CardDescription className="leading-6">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
