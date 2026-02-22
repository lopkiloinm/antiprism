import { useEffect, useState } from "react";

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      // 768px is the standard md breakpoint in Tailwind
      setIsMobile(window.innerWidth < 768);
    };

    // Check on initial load
    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Return false on server/initial render to avoid hydration mismatch
  return { isMobile: mounted ? isMobile : false };
}
