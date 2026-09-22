import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/*
 * Token usage meter. The bar is kept small while the label fits next to it;
 * as soon as the label would overflow the footer it is hidden (but keeps its
 * box, so the measurement stays stable) and the bar fills the freed space.
 * The bar itself is wrapped in a tooltip, so the usage is still readable on
 * hover (or tap on mobile).
 */
const TOKEN_BAR_WIDTH = 80; // w-20
const TOKEN_BAR_GAP = 8; // gap-2

export function TokenUsageBar({ used, limit }: { used: number; limit: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }

    const update = () => {
      const label = labelRef.current;
      if (!label) {
        return;
      }

      const available = wrap.clientWidth - TOKEN_BAR_WIDTH - TOKEN_BAR_GAP;
      setCollapsed(label.scrollWidth > available);
    };

    const observer = new ResizeObserver(update);
    observer.observe(wrap);

    return () => observer.disconnect();
  }, []);

  const usageLabel = `${(used / 1000).toFixed(1)}k / ${(limit / 1000).toFixed(1)}k used`;

  return (
    <div
      ref={wrapRef}
      className="flex min-w-0 flex-1 items-center justify-end gap-2"
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              tabIndex={0}
              aria-label={usageLabel}
              className={cn(
                "h-1.5 cursor-default overflow-hidden rounded-full bg-muted transition-[width]",
                collapsed ? "min-w-0 grow" : "w-20 shrink-0",
              )}
            />
          }
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${Math.min(100, (used / limit) * 100)}%`,
            }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          {usageLabel}
        </TooltipContent>
      </Tooltip>

      <span
        ref={labelRef}
        className={cn(
          "whitespace-nowrap text-xs text-muted-foreground",
          collapsed && "invisible w-0",
        )}
      >
        {usageLabel}
      </span>
    </div>
  );
}