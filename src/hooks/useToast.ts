"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/store/hooks";
import { addToast } from "@/store/slices/uiSlice";
import type { Toast } from "@/store/slices/uiSlice";

export function useToast() {
  const dispatch = useAppDispatch();
  return useCallback(
    (message: string, type?: Toast["type"]) => {
      dispatch(addToast({ message, type }));
    },
    [dispatch]
  );
}
