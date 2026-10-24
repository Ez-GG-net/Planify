import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Above-the-fold pitch. Server component: the call to action is a next/link
 * styled with shadcn's buttonVariants (Base UI's Button enforces <button>
 * semantics, so it must not be rendered as an anchor).
 */
export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-8xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-8 sm:pt-32 lg:pb-28 lg:pt-36">
      <h1 className="max-w-7xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
        Turn Big Goals into Small Steps.
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        Turn your big goals into small, achievable daily steps. Planify helps you break down ambitious plans into manageable tasks so you can make steady progress every day.
      </p>
      <Link
        href="/view/schedule"
        className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 gap-2 px-6 text-lg")}
      >
        Start planning
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}
