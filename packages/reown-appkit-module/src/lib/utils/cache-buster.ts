/**
 * Cache Busting Utilities for CSP Headers
 */

export function forceFreshCSP() {
  if (typeof window !== "undefined") {
    // Force browser to refetch CSP headers by adding cache-busting parameter
    const url = new URL(window.location.href);
    const now = Date.now();

    // Add cache-busting parameter
    url.searchParams.set("nocache", now.toString());

    // Only reload if we haven't already done this recently
    const lastCacheBust = sessionStorage.getItem("lastCacheBust");
    if (!lastCacheBust || now - parseInt(lastCacheBust) > 30000) {
      sessionStorage.setItem("lastCacheBust", now.toString());
      window.location.href = url.toString();
    }
  }
}

export function clearBrowserCSPCache() {
  if (typeof window !== "undefined") {
    // Clear various browser caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Clear sessionStorage CSP cache indicators
    sessionStorage.removeItem("cspCached");
    sessionStorage.removeItem("lastCacheBust");

    console.log("🧹 Browser CSP cache cleared");
  }
}

export function detectCSPIssues(): boolean {
  if (typeof window !== "undefined") {
    // Check for CSP violation errors in console
    const hasCSPErrors = window.performance
      .getEntriesByType("navigation")
      .some(
        (entry: any) => entry.transferSize === 0 && entry.type === "navigate"
      );

    return hasCSPErrors;
  }
  return false;
}

export function addCSPDebugInfo() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("🔍 CSP Debug Info:");
    console.log("Current URL:", window.location.href);
    console.log("User Agent:", navigator.userAgent);
    console.log("Timestamp:", new Date().toISOString());

    // Try to read CSP header from meta tag
    const cspMeta = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    );
    if (cspMeta) {
      console.log("CSP Meta:", cspMeta.getAttribute("content"));
    } else {
      console.log("No CSP meta tag found");
    }
  }
}

