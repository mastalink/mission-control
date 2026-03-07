import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function useViewport(): { width: number; bp: Breakpoint } {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const bp: Breakpoint = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  return { width, bp };
}
