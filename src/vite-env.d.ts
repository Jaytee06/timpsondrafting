/// <reference types="vite/client" />

interface Window {
  gtag?: (
    command: 'event',
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>
  ) => void;
}

interface ImportMetaEnv {
  readonly VITE_CRM_WEBHOOK_URL?: string;
  readonly VITE_CRM_WEBHOOK_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
