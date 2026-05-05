"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setAudience } from "@/store/slices/uiSlice";
import type { Audience } from "@/store/slices/uiSlice";

const VALID_HASHES: (Audience | null)[] = [null, "partner", "organizer", "promoter", "influencer"];

function getAudienceFromHash(): Audience | null | undefined {
  if (typeof window === "undefined") return undefined;
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  if (hash === "all" || hash === "") return null;
  if (hash === "promoter" || hash === "partner" || hash === "organizer" || hash === "influencer") return hash;
  return undefined;
}

export function AudienceHashSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fromHash = getAudienceFromHash();
    if (fromHash !== undefined) {
      dispatch(setAudience(fromHash));
    }
  }, [dispatch]);

  useEffect(() => {
    const onHashChange = () => {
      const fromHash = getAudienceFromHash();
      if (fromHash !== undefined) {
        dispatch(setAudience(fromHash));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [dispatch]);

  return null;
}
