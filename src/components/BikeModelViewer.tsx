"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setModelViewerFocused } from "@/store/slices/uiSlice";
import type { ModelVariant } from "@/store/slices/uiSlice";

const MODEL_VIEWER_SCRIPT =
  "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";

const MODEL_BASE = "/model/colorful%20motorcycle%203d%20model";

function getModelSrc(variant: ModelVariant): string {
  return variant === "ebike"
    ? `${MODEL_BASE}-ebike.glb`
    : `${MODEL_BASE}-bike.glb`;
}

const ALT_TEXT =
  "Exclusive VIP Experience — PRESTIX.VIP. Hiring a bike isn't just transport—it's an all-access pass.";

export function BikeModelViewer() {
  const dispatch = useAppDispatch();
  const modelVariant = useAppSelector((s) => s.ui.modelVariant);
  const scrollEnabled = useAppSelector((s) => s.ui.modelViewerFocused);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelSrc = getModelSrc(modelVariant);

  // Pointer-based activation: click inside = enable wheel zoom, click outside = disable.
  // Avoids focus/blur which can fire when model-viewer (or its shadow DOM) takes focus and breaks wheel.
  useEffect(() => {
    if (!scrollEnabled) return;
    const isInsideContainer = (target: EventTarget | null): boolean => {
      const el = containerRef.current;
      if (!el || !target || !(target instanceof Node)) return false;
      if (el.contains(target)) return true;
      let node: Node | null = target;
      while (node) {
        const root = node.getRootNode?.();
        if (root && root !== document && "host" in root && el.contains((root as ShadowRoot).host))
          return true;
        node = node.parentNode;
      }
      return false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (isInsideContainer(e.target)) return;
      dispatch(setModelViewerFocused(false));
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [scrollEnabled, dispatch]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function createViewer(src: string) {
      if (!container) return;
      const viewer = document.createElement("model-viewer");
      viewer.setAttribute("src", src);
      viewer.setAttribute("alt", ALT_TEXT);
      viewer.setAttribute("auto-rotate", "");
      viewer.setAttribute("camera-controls", "");
      viewer.setAttribute("camera-orbit", "90deg 75deg 105%");
      viewer.setAttribute("field-of-view", "37.5deg");
      viewer.setAttribute("shadow-intensity", "1");
      viewer.style.width = "100%";
      viewer.style.height = "100%";
      viewer.style.display = "block";
      container.innerHTML = "";
      container.appendChild(viewer);
      return viewer;
    }

    if (customElements.get("model-viewer")) {
      createViewer(modelSrc);
      return;
    }

    let script: HTMLScriptElement | null = null;

    const onDefined = () => {
      createViewer(modelSrc);
    };

    const loadScript = () => {
      customElements.whenDefined("model-viewer").then(onDefined);
    };

    script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SCRIPT;
    script.onload = loadScript;
    script.onerror = () => {
      console.warn("[BikeModelViewer] model-viewer script failed to load");
    };
    document.head.appendChild(script);

    return () => {
      container.innerHTML = "";
      if (script?.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [modelSrc]);

  return (
    <div className="relative w-full h-full min-h-full flex flex-col">
      <div
        ref={containerRef}
        className="min-h-0 flex-1 w-full overflow-hidden rounded-none border-0 border-border bg-background outline-none"
        style={{ height: '100%', minHeight: '100%' }}
        aria-label={`${ALT_TEXT} Use mouse, touch or arrow keys to move. Click on model to zoom with scroll wheel.`}
        onPointerDownCapture={() => dispatch(setModelViewerFocused(true))}
        onWheelCapture={(e) => {
          if (!scrollEnabled) e.stopPropagation();
        }}
      />
    </div>
  );
}
