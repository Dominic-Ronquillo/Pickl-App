/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin when it isn't served from the same origin as the app (e.g. https://api.courtside.ph). */
  readonly VITE_API_URL?: string;
  readonly VITE_PLAYER_APP_URL?: string;
  readonly VITE_VENUE_APP_URL?: string;
}
