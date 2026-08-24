import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isSameDay,
  startOfDay,
  startOfToday,
} from "date-fns"
import { CircleSmall } from "lucide-react"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import { CalendarDays } from "lucide-react"

function formatExactRelativeTimeFromToday (targetDate: Date | string | number): string {
  const todayObj = startOfToday();
  const targetObj = new Date(targetDate);
  
  const days = differenceInCalendarDays(targetObj, todayObj);
  
  if (days <= 1) return "";

  if (targetObj.getDate() === todayObj.getDate()) {
    const months = differenceInCalendarMonths(targetObj, todayObj);
    if (months > 0) {
      return `${months} ${months === 1 ? 'month' : 'months'} from today`;
    }
  }

  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} ${years === 1 ? 'year' : 'years'} from today`;
  }

  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} from today`;
  }

  return `${days} days from today`;
};
function formatExactRelativeTime (targetDate: Date | string | number, earlierDate: Date | string | number): string {
  const todayObj = new Date(earlierDate);
  const targetObj = new Date(targetDate);
  
  const days = differenceInCalendarDays(targetObj, todayObj);
  
  if (days <= 1) return "";

  if (targetObj.getDate() === todayObj.getDate()) {
    const months = differenceInCalendarMonths(targetObj, todayObj);
    if (months > 0) {
      return `${months} ${months === 1 ? 'month' : 'months'} later`;
    }
  }

  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} ${years === 1 ? 'year' : 'years'} later`;
  }

  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} later`;
  }

  return `${days} days later`;
};
// The allowed slider positions, in minutes, so each notch takes the same drag distance even though the minute gap increases
const SNAP_NOTCHES = [
  5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 360, 420,
  480,
]

export default function WizardTimeStep({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  timePerDay,
  setTimePerDay,
}: {
  startDate: Date | undefined
  endDate: Date | undefined
  setStartDate: (date: Date | undefined) => void
  setEndDate: (date: Date | undefined) => void
  setTimePerDay: (time: number) => void
  timePerDay: number
}) {
  const today = startOfDay(new Date())

  const setStart = (nextDate: Date) => {
    if (startDate && endDate) {
      const duration = differenceInCalendarDays(endDate, startDate)

      // Only move the end date if it becomes invalid
      if (endDate <= nextDate) {
        setEndDate(addDays(nextDate, duration))
      }
    }

    setStartDate(nextDate)
  }

  const startOptions = [
    {
      label: "Today",
      date: today,
    },
    {
      label: "Tomorrow",
      date: addDays(today, 1),
    },
    {
      label: "Next week",
      date: addDays(today,7),
    },
  ]

  const endOptions = startDate
    ? [
        {
          label:
            differenceInCalendarDays(startDate, today) >= 1
              ? format(addDays(startDate, 1), "EEEE")
              : "Tomorrow",
          date: addDays(startDate, 1),
        },
        {
          label: "1 week later",
          date: addDays(startDate, 7),
        },
        {
          label: "2 weeks later",
          date: addDays(startDate, 14),
        },
      ]
    : []

  const isPresetDate = (selected: Date | undefined) =>
    !!selected &&
    startOptions.some((option) => isSameDay(option.date, selected))

  const customDateLabel = startDate
    ? format(startDate, "MMMM d, yyyy")
    : "Pick another date..."

  const isPresetEndDate = (selected: Date | undefined) =>
    !!selected && endOptions.some((option) => isSameDay(option.date, selected))

  const customEndLabel = endDate
    ? format(endDate, "MMMM d, yyyy")
    : "Pick another date..."

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) {
      return `${mins} minute${mins === 1 ? "" : "s"}`
    }

    if (mins === 0) {
      return `${hours} hour${hours === 1 ? "" : "s"}`
    }

    return `${hours} hour${hours === 1 ? "" : "s"} ${mins} minute${mins === 1 ? "" : "s"}`
  }
  function minutesToNotchIndex(minutes: number) {
    let nearest = 0
    let nearestDistance = Infinity

    SNAP_NOTCHES.forEach((notch, index) => {
      const distance = Math.abs(notch - minutes)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    })

    return nearest
  }

  return (
    <div className="space-y-6">
      <Field>
        <FieldLabel>When do you want your schedule to begin?</FieldLabel>

        <div className="space-y-2">
          {startOptions.map((option) => (
            <Toggle
              key={option.label}
              pressed={!!startDate && isSameDay(startDate, option.date)}
              onPressedChange={(pressed) => {
                if (pressed) setStart(option.date)
              }}
              variant="outline"
              className="w-full justify-start gap-2 data-[state=on]:border-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <CircleSmall
                className={cn(
                  "size-4 transition-colors",
                  startDate && isSameDay(startDate, option.date)
                    ? "fill-current"
                    : "text-muted-foreground"
                )}
              />
              {option.label}
              <span className="w-full text-right text-sm text-muted-foreground">
                {format(option.date, "MMM d")}
              </span>
            </Toggle>
          ))}

          <Popover>
            <PopoverTrigger
              render={
                <Toggle
                  variant="outline"
                  pressed={!!startDate && !isPresetDate(startDate)}
                  className="w-full justify-start gap-2"
                />
              }
            >
              <CalendarDays className="size-4" />
              {customDateLabel}
              <span className="w-full text-right text-sm text-muted-foreground">
                {differenceInCalendarDays(customDateLabel, today) > 1 ? formatExactRelativeTimeFromToday(customDateLabel): ""}
              </span>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto p-0">
              <CalendarUI
                mode="single"
                selected={startDate}
                onSelect={(selected) => {
                  if (selected) {
                    setStart(startOfDay(selected))
                  }
                }}
                disabled={(day) => day < today}
                className="rounded-lg border"
              />
            </PopoverContent>
          </Popover>
        </div>
      </Field>

      {startDate && (
        <Field>
          <FieldLabel>When do you want your schedule to end?</FieldLabel>

          <div className="space-y-2">
            {endOptions.map((option) => (
              <Toggle
                key={option.label}
                pressed={!!endDate && isSameDay(endDate, option.date)}
                onPressedChange={(pressed) => {
                  if (pressed) setEndDate(option.date)
                }}
                variant="outline"
                className="w-full justify-start gap-2 data-[state=on]:border-ring data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                <CircleSmall
                  className={cn(
                    "size-4 transition-colors",
                    !!endDate && isSameDay(endDate, option.date)
                      ? "fill-current"
                      : "text-muted-foreground"
                  )}
                />
                {option.label}
                <span className="w-full text-right text-sm text-muted-foreground">
                  {format(option.date, "MMM d")}
                </span>
              </Toggle>
            ))}

            <Popover>
              <PopoverTrigger
                render={
                  <Toggle
                    variant="outline"
                    pressed={!!endDate && !isPresetEndDate(endDate)}
                    className="w-full justify-start gap-2"
                  />
                }
              >
                <CalendarDays className="size-4" />
                {customEndLabel}
                <span className="w-full text-right text-sm text-muted-foreground">
                  {differenceInCalendarDays(customEndLabel, startDate) > 1 ? formatExactRelativeTime(customEndLabel, startDate): ""}
                </span>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-auto p-0">
                <CalendarUI
                  mode="single"
                  selected={endDate}
                  onSelect={(selected) => {
                    if (selected) {
                      setEndDate(startOfDay(selected))
                    }
                  }}
                  disabled={(day) => day <= startDate}
                  className="rounded-lg border"
                />
              </PopoverContent>
            </Popover>
          </div>
        </Field>
      )}
      {startDate && endDate && (
        <Field>
          <FieldLabel>How long can you spend each day?</FieldLabel>
          <div className="mt-3 flex justify-center">
            <Slider
              id="wizard-time-per-day"
              value={minutesToNotchIndex(timePerDay)}
              min={0}
              max={SNAP_NOTCHES.length - 1}
              step={1}
              onValueChange={(value) => {
                setTimePerDay(SNAP_NOTCHES[Number(value)])
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold tabular-nums">
              {timePerDay >= 8 * 60 ? "8+ hours" : formatDuration(timePerDay)}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum time per day
            </p>
          </div>
        </Field>
      )}
    </div>
  )
}
