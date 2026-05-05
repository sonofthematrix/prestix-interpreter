"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state - vibrant blue/primary color with visible border
      "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-400",
      // Unchecked state - clearly visible gray with darker border for contrast
      "data-[state=unchecked]:bg-gray-300 data-[state=unchecked]:border-gray-400 dark:data-[state=unchecked]:bg-gray-600 dark:data-[state=unchecked]:border-gray-500",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform",
        // Thumb colors - bright white when checked, lighter gray when unchecked for maximum contrast
        "data-[state=checked]:translate-x-5 data-[state=checked]:bg-white",
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-white dark:data-[state=unchecked]:bg-gray-200"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
