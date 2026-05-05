"use client";

import { ScrollSpy, useScrollToSectionHash } from "@/components/ScrollSpy";

export function ScrollSpyProvider() {
  useScrollToSectionHash();
  return <ScrollSpy />;
}
