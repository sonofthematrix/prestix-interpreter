"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setHubListViewMode } from "@/store/slices/uiSlice";
import { getHubViewForPath } from "@/lib/hub-view-config";

/**
 * Router → UI store bridge: syncs pathname to Redux hubListViewMode.
 *
 * This is the single designated place that writes hub list view from the router.
 * Call in the hub layout so every hub page gets the correct default view (cards vs table).
 *
 * Redux SSoT: pathname is the external source; this hook is the one bridge that syncs
 * it into the store. Alternative would be a pathname subscription that dispatches
 * on change instead of useEffect(pathname, dispatch).
 */
export function useHubViewPreference(): void {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!pathname?.startsWith("/hub")) return;
    const preferred = getHubViewForPath(pathname);
    dispatch(setHubListViewMode(preferred));
  }, [pathname, dispatch]);
}
