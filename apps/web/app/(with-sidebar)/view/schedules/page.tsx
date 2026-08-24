"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getScheduleRepository } from "@/database";
import { SchedulePlan } from "@planify/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import ScheduleTimeline from "@/components/schedule/timeline/desktop.schedule-timeline";
import ScheduleList from "@/components/schedule/timeline/mobile.schedule-list";

const DESKTOP_BREAKPOINT = 1545;

export default function ScheduleDashboardPage() {
  // Load schedules in an effect so the server-rendered HTML never reads
  // localStorage (which only exists in the browser).
  const [hydrated, setHydrated] = useState(false);
  const [schedules, setSchedules] = useState<SchedulePlan[]>([]);

  useEffect(() => {
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
