"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress@1.1.2";

import { cn } from "./utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "glass relative h-2 w-full overflow-hidden rounded-full border border-[var(--k1-border-subtle)]",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-[var(--k1-accent)] h-full w-full flex-1 transition-all duration-300 shadow-[0_0_8px_rgba(110,231,243,0.5)]",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
