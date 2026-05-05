"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setNdaAccepted } from "@/store/slices/authSlice";
import { acceptNda } from "@/lib/api";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function NdaOverlay() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const ndaAccepted = useAppSelector((s) => s.auth.ndaAccepted);
  const user = useAppSelector((s) => s.auth.user);
  const [submitting, setSubmitting] = useState(false);

  const show = user != null && ndaAccepted === false;

  const handleAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await acceptNda();
      if (res.accepted) {
        dispatch(setNdaAccepted(true));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nda-title"
    >
      <div className="max-w-lg rounded-lg border border-white/20 bg-zinc-900 p-6 text-center">
        <h2 id="nda-title" className="font-serif text-xl font-bold text-white">
          {t("nda.title")}
        </h2>
        <p className="mt-4 text-sm text-white/80">
          {t("nda.body")}
        </p>
        <button
          type="button"
          onClick={handleAccept}
          disabled={submitting}
          className="mt-6 rounded bg-white px-6 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? t("nda.accepting") : t("nda.accept")}
        </button>
      </div>
    </div>
  );
}
