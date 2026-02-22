import { useEffect, useState } from "react";

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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

  return { isMobile };
}
