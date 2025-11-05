---
timestamp: 'Mon Nov 03 2025 21:01:00 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251103_210100.a6a0b744.md]]'
content_id: ec12613951b1802489ab10439d1be2e32d6fb0c22b6dbd2826aa440892191a8c
---

# file: src/concepts/PlatformLink/PlatformLinkConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LibraryCacheConcept from "../LibraryCache/LibraryCacheConcept.ts";
import TrackScoringConcept from "../TrackScoring/TrackScoringConcept.ts";

// Generic types of this concept. User is an external, polymorphic type.
type User = ID;
type LinkId = ID;
type CapabilityId = ID;

const PREFIX = "PlatformLink.";
const SUPPORTED_PLATFORMS = ["spotify", "youtube_music"];
const TOKEN_LIFESPAN_MS = 3600 * 1000; // 1 hour dummy token lifespan

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const DEFAULT_SPOTIFY_SCOPES = [
  "user-library-read",
  "user-read-recently-played",
  "playlist-read-private",
  "user-top-read",
];
const AUTH_SESSION_LIFESPAN_MS = 10 * 60 * 1000; // 10 minutes
const CODE_VERIFIER_LENGTH = 96;
const STATE_LENGTH = 48;

/**
 * State representation for a user known to this concept.
 * Corresponds to:
 *   A set of `Users` with
 *     - a `userId` of type `String` (mapped to `_id`)
 *     - a `createdAt` timestamp of type `Float`
 */
interface UserDoc {
  _id: User;
  createdAt: number;
}

/**
 * State representation for a platform link.
 * Corresponds to:
 *   A set of `Links` with
 *     - a `linkId` of type `String` (mapped to `_id`)
 *     - a `userId` of type `String`
 *     - a `platform` of type `String`
 *     - an `accessToken` of type `String`
 *     - an `tokenExpiration` timestamp of type `Float`
 */
interface LinkDoc {
  _id: LinkId;
  userId: User;
  platform: string;
  accessToken: string;
  tokenExpiration: number;
  refreshToken?: string;
  tokenType?: string;
  scopes?: string[];
  lastAuthorizedAt?: number;
}

interface AuthSessionDoc {
  _id: string; // state
  userId: User;
  platform: string;
  codeVerifier: string;
  redirectUri: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
}

interface SpotifyTokenSuccess {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
}

type SpotifyTokenResult = SpotifyTokenSuccess | { error: string };

/**
 * State representation for a capability associated with a link.
 * Corresponds to:
 *   A set of `Capabilities` with
 *     - a `linkId` of type `String`
 *     - a `capability` of type `String`
 */
interface CapabilityDoc {
  _id: CapabilityId;
  linkId: LinkId;
  capability: string;
}

/**
 * concept: PlatformLink [User]
 * purpose: Provide authenthicated access to a streaming platform. Give other concepts a safe way of talking to the streaming platform without leaking tokens.
 * principle: When a user links their streaming platform account, the app can verify capabilities and renew tokens on their behalf without other concepts ever touching credentials.
 */
export default class PlatformLinkConcept {
  private readonly users: Collection<UserDoc>;
  private readonly links: Collection<LinkDoc>;
  private readonly capabilities: Collection<CapabilityDoc>;
  private readonly authSessions: Collection<AuthSessionDoc>;
  #spotifyConfigCache?: SpotifyConfigResult | { error: string };

  constructor(private readonly db: Db) {
    this.users = db.collection<UserDoc>(PREFIX + "users");
    this.links = db.collection<LinkDoc>(PREFIX + "links");
    this.capabilities = db.collection<CapabilityDoc>(PREFIX + "capabilities");
    this.authSessions = db.collection<AuthSessionDoc>(PREFIX + "authSessions");

    // Ensure state documents expire automatically in Mongo if supported.
    this.authSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
      console.warn("PlatformLink.authSessions TTL index warning:", error);
    });
  }

  /**
   * Creates a new link to a streaming platform for a given user.
   *
   * requires: userId is valid, platform is supported, NO existing link for the user/platform combination.
   * effects: Creates and returns a new link record. Stores a new access token and expiration time. If the user is new to this concept, a corresponding user record is also created.
   */
  async link({ userId, platform }: { userId: User; platform: string }): Promise<{ linkId: LinkId } | { error: string }> {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return { error: `Platform '${platform}' is not supported.` };
    }

    const existingLink = await this.links.findOne({ userId, platform });
    if (existingLink) {
      return { error: `User already has a link for platform '${platform}'.` };
    }

    // This concept now "knows" about this user.
    await this.users.updateOne({ _id: userId }, { $setOnInsert: { createdAt: Date.now() } }, { upsert: true });

    const newLinkId = freshID() as LinkId;
    const newLink: LinkDoc = {
      _id: newLinkId,
      userId,
      platform,
      accessToken: `dummy_token_${freshID()}`, // In a real app, this comes from an OAuth flow
      tokenExpiration: Date.now() + TOKEN_LIFESPAN_MS,
    };

    await this.links.insertOne(newLink);

    return { linkId: newLinkId };
  }

  /**
   * Refreshes the access token for an existing link.
   *
   * requires: link exists.
   * effects: Updates accessToken, prolongs and returns new expiration time.
   */
  async refresh({ linkId }: { linkId: LinkId }): Promise<{ newExpiration: number } | { error: string }> {
    const link = await this.links.findOne({ _id: linkId });
    if (!link) {
      return { error: `Link with id '${linkId}' not found.` };
    }
    if (link.platform !== "spotify") {
      return { error: "Token refresh is only implemented for Spotify links." };
    }
    if (!link.refreshToken) {
      return { error: "Link is missing a refresh token. Re-authorize the account." };
    }

  const tokenResult = await this.#requestSpotifyTokens({
      type: "refresh_token",
      refreshToken: link.refreshToken,
    });
    if ("error" in tokenResult) {
      return tokenResult;
    }

    const tokenExpiration = computeExpiration(tokenResult.expires_in);
    const update: Partial<LinkDoc> = {
      accessToken: tokenResult.access_token,
      tokenExpiration,
      tokenType: tokenResult.token_type,
      lastAuthorizedAt: Date.now(),
    };
    if (tokenResult.refresh_token) {
      update.refreshToken = tokenResult.refresh_token;
    }
    if (tokenResult.scope) {
      update.scopes = parseScopes(tokenResult.scope);
    }

    await this.links.updateOne({ _id: linkId }, { $set: update });
    return { newExpiration: tokenExpiration };
  }

  /**
   * Revokes a user's link to a platform, deleting all associated data.
   *
   * requires: Link exists.
   * effects: Deletes the link and any associated capabilities.
   */
  async revoke({ linkId }: { linkId: LinkId }): Promise<{ removed: boolean } | { error: string }> {
    const link = await this.links.findOne({ _id: linkId });
    if (!link) {
      return { error: `Link with id '${linkId}' not found.` };
    }

    // Delete associated capabilities first
    await this.capabilities.deleteMany({ linkId });

    // Then delete the link itself
    const deleteResult = await this.links.deleteOne({ _id: linkId });

    return { removed: deleteResult.deletedCount > 0 };
  }

  /**
   * Checks if a link is active and possesses a specific capability.
   *
   * effects: returns whether a Link has the needed access and availability.
   *          Simply put, returns whether a capability exists for the link and the token is not expired.
   */
  async can({ linkId, capability }: { linkId: LinkId; capability: string }): Promise<{ ok: boolean }> {
    const link = await this.links.findOne({ _id: linkId });

    if (!link) {
      return { ok: false };
    }

    if (link.tokenExpiration < Date.now()) {
      return { ok: false };
    }

    const hasCapability = await this.capabilities.findOne({ linkId, capability });

    return { ok: !!hasCapability };
  }

  // ----- Integration helpers (wire PlatformLink → LibraryCache → TrackScoring) -----

  /**
   * Begins the Spotify OAuth linking flow by issuing a PKCE challenge and returning an authorize URL.
   */
  async startAuth({
    userId,
    platform,
    scopes,
    redirectUri,
  }: {
    userId: User;
    platform: string;
    scopes?: string[];
    redirectUri?: string;
  }): Promise<{ authorizeUrl: string; state: string; expiresAt: number } | { error: string }> {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return { error: `Platform '${platform}' is not supported.` };
    }
    if (platform !== "spotify") {
      return { error: "OAuth linking is currently only implemented for Spotify." };
    }

  const spotifyConfig = this.#getSpotifyConfig();
    if ("error" in spotifyConfig) {
      return spotifyConfig;
    }

    const effectiveRedirect = redirectUri ?? spotifyConfig.redirectUri;
    if (!effectiveRedirect) {
      return { error: "Spotify redirect URI is not configured." };
    }

    await this.users.updateOne({ _id: userId }, { $setOnInsert: { createdAt: Date.now() } }, { upsert: true });

    const state = randomString(STATE_LENGTH, STATE_ALPHABET);
    const codeVerifier = randomString(CODE_VERIFIER_LENGTH, CODE_VERIFIER_ALPHABET);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const scopeList = normalizeScopes(scopes ?? spotifyConfig.defaultScopes ?? DEFAULT_SPOTIFY_SCOPES);
    const expiresAt = Date.now() + AUTH_SESSION_LIFESPAN_MS;

    await this.authSessions.insertOne({
      _id: state,
      userId,
      platform,
      codeVerifier,
      redirectUri: effectiveRedirect,
      scopes: scopeList,
      createdAt: Date.now(),
      expiresAt,
    });

    const authorizeUrl = new URL(SPOTIFY_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", spotifyConfig.clientId);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("redirect_uri", effectiveRedirect);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", scopeList.join(" "));
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);

    return { authorizeUrl: authorizeUrl.toString(), state, expiresAt };
  }

  /**
   * Completes the Spotify OAuth flow with an authorization code and stores the resulting tokens on the link.
   */
  async completeAuth({ state, code }: { state: string; code: string }): Promise<
    { linkId: LinkId; platform: string; tokenExpiration: number; scopes: string[] } | { error: string }
  > {
    const session = await this.authSessions.findOne({ _id: state });
    if (!session) {
      return { error: "Invalid or expired authorization state." };
    }
    if (session.expiresAt < Date.now()) {
      await this.authSessions.deleteOne({ _id: state });
      return { error: "Authorization session expired. Restart the connect flow." };
    }

  const spotifyConfig = this.#getSpotifyConfig();
    if ("error" in spotifyConfig) {
      return spotifyConfig;
    }

  const tokenResult = await this.#requestSpotifyTokens({
      type: "authorization_code",
      code,
      redirectUri: session.redirectUri,
      codeVerifier: session.codeVerifier,
    });
    if ("error" in tokenResult) {
      return tokenResult;
    }

    const tokenExpiration = computeExpiration(tokenResult.expires_in);
    const scopes = tokenResult.scope ? parseScopes(tokenResult.scope) : session.scopes;
    const update: Partial<LinkDoc> = {
      accessToken: tokenResult.access_token,
      tokenExpiration,
      tokenType: tokenResult.token_type,
      scopes,
      refreshToken: tokenResult.refresh_token ?? undefined,
      lastAuthorizedAt: Date.now(),
    };

    let linkId: LinkId;
    const existing = await this.links.findOne({ userId: session.userId, platform: session.platform });
    if (existing) {
      linkId = existing._id;
      await this.links.updateOne({ _id: existing._id }, { $set: update });
    } else {
      linkId = freshID() as LinkId;
      await this.links.insertOne({
        _id: linkId,
        userId: session.userId,
        platform: session.platform,
        accessToken: update.accessToken!,
        tokenExpiration,
        refreshToken: update.refreshToken,
        tokenType: update.tokenType,
        scopes,
        lastAuthorizedAt: update.lastAuthorizedAt,
      });
    }

    await this.authSessions.deleteOne({ _id: state });
    return { linkId, platform: session.platform, tokenExpiration, scopes };
  }

  /**
   * Lists links for a user to retrieve linkIds and platforms.
   */
  async listLinks({ userId }: { userId: User }): Promise<{ links: Array<{ linkId: LinkId; platform: string; tokenExpiration: number }> } | { error: string }> {
    if (!userId) return { error: "userId must be provided" };
    const docs = await this.links.find({ userId }).toArray();
    const links = docs.map((d) => ({ linkId: d._id, platform: d.platform, tokenExpiration: d.tokenExpiration }));
    return { links };
  }

  /**
   * Accepts a library payload (tracks, likes, plays, playlists) and syncs it into LibraryCache for the user behind the link.
   * This gives TrackScoring real data to work with without frontend calling LibraryCache directly.
   */
  async syncLibrary({ linkId, payload }: { linkId: LinkId; payload: {
    userId: User;
    tracks: Array<{ trackId: string; title: string; artist: string; available: boolean; tempo?: number; energy?: number; valence?: number }>;
    likes: Array<{ trackId: string; addedAt: number }>;
    plays: Array<{ trackId: string; lastPlayedAt: number }>;
    playlists: Array<{ playlistId: string; entries: { idx: number; trackId: string }[]; updatedAt: number }>;
  } }): Promise<{ synced: boolean } | { error: string }> {
    const link = await this.links.findOne({ _id: linkId });
    if (!link) return { error: `Link with id '${linkId}' not found.` };
    if (link.tokenExpiration < Date.now()) return { error: "Link token expired. Refresh and retry." };

    if (!payload || !payload.userId) return { error: "Invalid payload: userId required" };
    if (payload.userId !== link.userId) return { error: "Payload userId does not match link user" };

  const lc = new LibraryCacheConcept(this.db);
  const result = await lc.sync(payload);
    if (result && typeof result === "object" && "error" in result) {
      return { error: result.error };
    }
    return { synced: true };
  }

  /**
   * Convenience: ingest stats into TrackScoring from LibraryCache and prime scores.
   * Returns how many stats were ingested and whether default weights were set.
   */
  async bootstrapTrackScoring({ userId, size = 50 }: { userId: User; size?: number }): Promise<
    { ingested: number; ensuredWeights: boolean; previewCount: number; source: "scores" | "bootstrap" | "empty" } | { error: string }
  > {
    if (!userId) return { error: "userId must be provided" };
    const ts = new TrackScoringConcept(this.db);
    const ingest = await ts.ingestFromLibraryCache({ userId });
    if ("error" in ingest) return { error: ingest.error };

    const preview = await ts.preview({ userId, size });
    if ("error" in preview) return { error: preview.error };

    return { ingested: ingest.ingested, ensuredWeights: ingest.ensuredWeights, previewCount: preview.tracks.length, source: preview.source };
  }

  #getSpotifyConfig(): SpotifyConfigResult | { error: string } {
    if (!this.#spotifyConfigCache) {
      this.#spotifyConfigCache = spotifyEnvConfig();
    }
    return this.#spotifyConfigCache;
  }

  async #requestSpotifyTokens(request: SpotifyTokenRequest): Promise<SpotifyTokenResult> {
    const config = this.#getSpotifyConfig();
    if ("error" in config) {
      return config;
    }
    return await requestSpotifyToken(config, request);
  }
}

// --- Spotify helpers -------------------------------------------------------

const STATE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_VERIFIER_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";

function randomString(length: number, alphabet: string): string {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  let result = "";
  for (const value of values) {
    result += alphabet[value % alphabet.length]!;
  }
  return result;
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(digest);
}

function computeExpiration(expiresInSeconds: number): number {
  const safetyWindowMs = 60 * 1000; // refresh one minute before Spotify says it expires
  return Date.now() + Math.max(0, expiresInSeconds * 1000 - safetyWindowMs);
}

function parseScopes(scope: string): string[] {
  return scope.split(/\s+/u).map((item) => item.trim()).filter((item) => item.length > 0);
}

function normalizeScopes(scopes: string[]): string[] {
  return Array.from(new Set(scopes.map((scope) => scope.trim()).filter((scope) => scope.length > 0)));
}

type SpotifyTokenRequest =
  | { type: "authorization_code"; code: string; redirectUri: string; codeVerifier: string }
  | { type: "refresh_token"; refreshToken: string };

interface SpotifyConfigResult {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  defaultScopes?: string[];
}

function spotifyEnvConfig(): SpotifyConfigResult | { error: string } {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI");
  if (!clientId || !clientSecret) {
    return { error: "Spotify client credentials are not configured." };
  }
  const scopes = Deno.env.get("SPOTIFY_SCOPES")?.split(/[,\s]+/u).filter((item) => item.length > 0);
  return { clientId, clientSecret, redirectUri, defaultScopes: scopes };
}

function scopeHeader(config: SpotifyConfigResult): string {
  return `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`;
}

async function requestSpotifyToken(
  config: SpotifyConfigResult,
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

```

## LibraryCache

Specification:
