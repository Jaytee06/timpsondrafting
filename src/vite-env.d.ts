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
  readonly VITE_CRM_UPDATE_WEBHOOK_API_KEY?: string;
  readonly VITE_CRM_WEBHOOK_DRY_RUN?: string;
  readonly VITE_AI_CHAT_API_URL?: string;
  readonly VITE_COMPANY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
