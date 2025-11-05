// Utility helpers for interacting with the Spotify Web API.
// Provides shared logic for configuration, scope parsing, token exchange, and expiration handling.

export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  defaultScopes?: string[];
}

export type SpotifyTokenRequest =
  | { type: "authorization_code"; code: string; redirectUri: string; codeVerifier: string }
  | { type: "refresh_token"; refreshToken: string };

export interface SpotifyTokenSuccess {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

export type SpotifyTokenResult = SpotifyTokenSuccess | { error: string };

/**
 * Reads Spotify client configuration from the environment.
 */
export function getSpotifyConfig(): SpotifyConfig | { error: string } {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI");
  if (!clientId || !clientSecret) {
    return { error: "Spotify client credentials are not configured." };
  }
  const scopes = Deno.env.get("SPOTIFY_SCOPES")?.split(/[\s,]+/u).filter((value) => value.length > 0);
  return { clientId, clientSecret, redirectUri, defaultScopes: scopes };
}

/**
 * Computes an expiration timestamp (ms) for a token, subtracting a small safety buffer.
 */
export function computeSpotifyExpiration(expiresInSeconds: number): number {
  const safetyWindowMs = 60 * 1000; // refresh one minute early
  return Date.now() + Math.max(0, expiresInSeconds * 1000 - safetyWindowMs);
}

/**
 * Normalises a scope string from Spotify into an array of scopes.
 */
export function parseSpotifyScopes(scope: string): string[] {
  return scope.split(/\s+/u).map((item) => item.trim()).filter((item) => item.length > 0);
}

/**
 * Normalises an arbitrary scope list by trimming whitespace and deduplicating.
 */
export function normalizeSpotifyScopes(scopes: string[]): string[] {
  return Array.from(new Set(scopes.map((scope) => scope.trim()).filter((scope) => scope.length > 0)));
}

function scopeHeader(config: SpotifyConfig): string {
  return `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`;
}

/**
 * Exchanges an OAuth authorization code or refresh token for new Spotify tokens.
 */
export async function requestSpotifyToken(
  config: SpotifyConfig,
  request: SpotifyTokenRequest,
): Promise<SpotifyTokenResult> {
  const body = new URLSearchParams();
  if (request.type === "authorization_code") {
    body.set("grant_type", "authorization_code");
    body.set("code", request.code);
    body.set("redirect_uri", request.redirectUri);
    body.set("client_id", config.clientId);
    body.set("code_verifier", request.codeVerifier);
  } else {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", request.refreshToken);
    body.set("client_id", config.clientId);
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: scopeHeader(config),
    },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload.access_token !== "string" || typeof payload.expires_in !== "number") {
    const description = typeof payload?.error_description === "string"
      ? payload.error_description
      : typeof payload?.error === "string"
        ? payload.error
        : "Spotify token exchange failed.";
    return { error: description };
  }

  return payload as SpotifyTokenSuccess;
}

// ---------------- Spotify Web API (resource) helpers ----------------

export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function spotifyGet<T>(accessToken: string, path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${SPOTIFY_API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.error_description === "string"
        ? payload.error_description
        : `Spotify API request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as T;
}

// Saved tracks (likes)
export interface SavedTrackItem {
  added_at: string; // ISO date
  track: { id: string; name: string; artists: Array<{ name: string }>; available_markets?: string[] };
}

export async function getAllSavedTracks(accessToken: string, max: number = 500): Promise<SavedTrackItem[]> {
  const items: SavedTrackItem[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/me/tracks?limit=50`;
  while (url && items.length < max) {
    const page: { items: SavedTrackItem[]; next: string | null } = await spotifyGet<{ items: SavedTrackItem[]; next: string | null }>(accessToken, url);
    items.push(...page.items);
    url = page.next;
  }
  return items.slice(0, max);
}

// Recently played
export interface RecentlyPlayedItem {
  played_at: string; // ISO date
  track: { id: string; name: string; artists: Array<{ name: string }> };
}

export async function getRecentlyPlayed(accessToken: string, limit: number = 50): Promise<RecentlyPlayedItem[]> {
  const qs = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 50)) });
  const data = await spotifyGet<{ items: RecentlyPlayedItem[] }>(accessToken, `/me/player/recently-played?${qs}`);
  return data.items ?? [];
}

// Playlists and tracks
export interface UserPlaylistItem { id: string; name: string; }
export async function getUserPlaylists(accessToken: string, max: number = 100): Promise<UserPlaylistItem[]> {
  const items: UserPlaylistItem[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;
  while (url && items.length < max) {
    const page: { items: Array<{ id: string; name: string }>; next: string | null } = await spotifyGet<{ items: Array<{ id: string; name: string }>; next: string | null }>(accessToken, url);
    items.push(...page.items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    url = page.next;
  }
  return items.slice(0, max);
}

export interface PlaylistTrackItem {
  track: {
    id: string;
    name?: string;
    artists?: Array<{ name: string }>;
    available_markets?: string[];
  } | null;
}
export async function getPlaylistTracks(accessToken: string, playlistId: string, max: number = 500): Promise<PlaylistTrackItem[]> {
  const items: PlaylistTrackItem[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100`;
  while (url && items.length < max) {
    const page: { items: PlaylistTrackItem[]; next: string | null } = await spotifyGet<{ items: PlaylistTrackItem[]; next: string | null }>(accessToken, url);
    items.push(...page.items);
    url = page.next;
  }
  return items.slice(0, max);
}

export interface SpotifyAudioFeaturesSnapshot {
  id: string;
  tempo?: number;
  energy?: number;
  valence?: number;
  acousticness?: number;
  danceability?: number;
}

const AUDIO_FEATURE_CHUNK = 100;

export async function getAudioFeatures(accessToken: string, trackIds: string[]): Promise<Map<string, SpotifyAudioFeaturesSnapshot>> {
  const unique = Array.from(new Set(trackIds.filter((id) => typeof id === "string" && id.length > 0)));
  const result = new Map<string, SpotifyAudioFeaturesSnapshot>();
  if (unique.length === 0) {
    return result;
  }

  for (let i = 0; i < unique.length; i += AUDIO_FEATURE_CHUNK) {
    const slice = unique.slice(i, i + AUDIO_FEATURE_CHUNK);
    const idsParam = slice.join(",");
    const payload = await spotifyGet<{ audio_features: Array<Record<string, unknown> | null> }>(
      accessToken,
      `/audio-features?ids=${encodeURIComponent(idsParam)}`,
    );
    for (const raw of payload.audio_features ?? []) {
      const id = typeof raw?.id === "string" ? raw.id : null;
      if (!id) continue;
      result.set(id, {
        id,
        tempo: typeof raw?.tempo === "number" ? raw.tempo : undefined,
        energy: typeof raw?.energy === "number" ? raw.energy : undefined,
        valence: typeof raw?.valence === "number" ? raw.valence : undefined,
        acousticness: typeof raw?.acousticness === "number" ? raw.acousticness : undefined,
        danceability: typeof raw?.danceability === "number" ? raw.danceability : undefined,
      });
    }
  }

  return result;
}
