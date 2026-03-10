/// <reference types="vite/client" />

interface Window {
  gtag?: (
    command: 'event',
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => void;
}
