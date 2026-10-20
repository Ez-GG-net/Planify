"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getScheduleRepository } from "@/database";
import { SchedulePlan } from "@planify/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import ScheduleTimeline from "@/components/schedule/timeline/desktop.schedule-timeline";
import ScheduleList from "@/components/schedule/timeline/mobile.schedule-list";
import { useSession } from "@/lib/auth-client";

const DESKTOP_BREAKPOINT = 1545;

export default function ScheduleDashboardPage() {
  // Load schedules in an effect so the server-rendered HTML never reads
  // localStorage (which only exists in the browser).
  const [hydrated, setHydrated] = useState(false);
  const [schedules, setSchedules] = useState<SchedulePlan[]>([]);
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;

    async function loadSchedules() {
      const result = await getScheduleRepository().getSchedules();

      if (!cancelled) {
        setSchedules(result);
        setHydrated(true);
      }
    }

    void loadSchedules();

    return () => {
      cancelled = true;
    };
  }, [isPending, session]);

  // Re-load after bfcache restore (back/forward button) — the [] effect
  // above does not re-fire when the browser paints from cache.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      void getScheduleRepository().getSchedules().then((result) => {
        setSchedules(result);
        setHydrated(true);
      });
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const isDesktop = useMediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

  if (!hydrated) {
    return (
      <main className="m-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  return (
    <main>
      {isDesktop ? (
        <ScheduleTimeline schedules={schedules} />
      ) : (
        <ScheduleList schedules={schedules} />
      )}
    </main>
  );
}
