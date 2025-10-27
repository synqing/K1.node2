"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch@1.1.3";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 glass data-[state=unchecked]:border-[var(--k1-border-subtle)] data-[state=checked]:border-[var(--k1-accent)] data-[state=checked]:shadow-glow focus-visible:border-[var(--k1-accent)] focus-visible:shadow-glow",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-all data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-[var(--k1-text-dim)] data-[state=checked]:bg-[var(--k1-accent)] shadow-md",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
