/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RAZORPAY_KEY_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
