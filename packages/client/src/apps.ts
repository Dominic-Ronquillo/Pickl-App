/**
 * Where the two web apps live, so each can link to the other (owners who also play).
 * Set at build time; the defaults are the local dev servers.
 */
export const APP_URLS = {
  player: import.meta.env.VITE_PLAYER_APP_URL || 'http://localhost:5173',
  venue: import.meta.env.VITE_VENUE_APP_URL || 'http://localhost:5174',
};
