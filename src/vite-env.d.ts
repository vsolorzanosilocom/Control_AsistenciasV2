/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_APPS_SCRIPT_URL?: string;
  readonly VITE_GOOGLE_SHEET_ID?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_OFFICE_LAT?: string;
  readonly VITE_OFFICE_LNG?: string;
  readonly VITE_OFFICE_RADIUS_METERS?: string;
  readonly APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
