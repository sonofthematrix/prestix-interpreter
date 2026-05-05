"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HubSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Placeholder text */
  placeholder?: string;
  /** Optional class for the wrapper */
  wrapperClassName?: string;
}

/**
 * Standard search input for Hub tables and card views.
 * Theme-aware (dark/light), responsive, consistent styling.
 */
export function HubSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  wrapperClassName,
  ...props
}: HubSearchInputProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 items-center sm:min-w-[180px] sm:max-w-[280px] sm:flex-initial",
        wrapperClassName
      )}
    >
      <SearchIcon
        className="absolute left-3 h-4 w-4 shrink-0 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        type="search"
        role="searchbox"
        aria-label={placeholder}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "h-9 pl-9 pr-3 border-border bg-background text-foreground placeholder:text-muted-foreground",
          "dark:border-border dark:bg-background dark:text-foreground",
          className
        )}
        {...props}
      />
    </div>
  );
}
