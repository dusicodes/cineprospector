"use client";

import { useEffect } from "react";

/** Redirects the browser to `destination` after `delayMs` milliseconds. */
export function TimedRedirector({ destination, delayMs = 3000 }: { destination: string; delayMs?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.assign(destination);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [destination, delayMs]);

  return null;
}