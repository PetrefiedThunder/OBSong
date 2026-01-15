/**
 * A lightweight analytics service for tracking user events.
 * This can be extended to send data to any analytics provider.
 */

type EventName = 'tour_started' | 'tour_skipped' | 'tour_completed' | 'composition_generated' | 'composition_saved';

interface EventPayload {
  [key: string]: string | number | boolean | undefined;
}

export function logAnalyticsEvent(name: EventName, payload?: EventPayload) {
  // For now, this simply logs to the console. In a real application,
  // this would be extended to send data to a service like Google Analytics,
  // PostHog, or a custom backend.
  console.log(`[Analytics] Event: ${name}`, payload ? { payload } : '');

  // Example of how you might extend this for a real service:
  /*
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, payload);
  }
  */
}
