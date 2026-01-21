import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    goatcounter?: {
      count: (params: {
        path?: string;
        title?: string;
        referrer?: string;
        event?: boolean;
      }) => void;
      no_onload?: boolean;
    };
  }
}

/**
 * Hook to automatically track page views with Goatcounter analytics.
 * Should be called once at the root of the application.
 *
 * Tracks route changes using Wouter's useLocation hook and sends
 * page view events to Goatcounter.
 */
export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    // Wait for Goatcounter to load (it's loaded async)
    if (window.goatcounter && typeof window.goatcounter.count === 'function') {
      window.goatcounter.count({
        path: location,
      });
    }
  }, [location]);
}
