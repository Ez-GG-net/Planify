"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { Button } from "@/components/ui/button";

interface DateHeaderProps {
  month: Date;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
}

export default function DateHeader({
  month,
  onPreviousMonth,
  onNextMonth,
}: DateHeaderProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  return (
    <div className="border-b">
      {/* Month navigation */}
      <div className="flex items-center justify-center border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviousMonth}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <h2 className="text-sm font-semibold">
          {format(month, "MMMM yyyy")}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextMonth}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Days */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(40px, 1fr))`,
        }}
      >
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex flex-col items-center border-r py-2 last:border-r-0"
          >
            <span className="text-xs text-muted-foreground">
              {format(day, "EEE")}
            </span>

            <span className="text-sm font-medium">
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}