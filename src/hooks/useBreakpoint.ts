import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | 'desktop';

const breakpoints = {
  sm: 375,
  md: 430,
  lg: 600,
  xl: 1024,
  desktop: 1025,
};

export function useBreakpoint(): Breakpoint {
  const getBreakpoint = useCallback((): Breakpoint => {
    const width = window.innerWidth;
    if (width <= breakpoints.sm) return 'sm';
    if (width <= breakpoints.md) return 'md';
    if (width <= breakpoints.lg) return 'lg';
    if (width <= breakpoints.xl) return 'xl';
    return 'desktop';
  }, []);

  const [breakpoint, setBreakpoint] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getBreakpoint]);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint !== 'desktop';
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'xl';
}

