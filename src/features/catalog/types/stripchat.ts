/**
 * Raw response types for the Stripcash "Links & Creatives" API (the simple one,
 * keyed only by `userId` — no API key, no Authorization header).
 *
 *   List:        {base}/api/models?userId={userId}&{filters}
 *   Online only: {base}/api/models/online?userId={userId}
 *
 * Docs: https://stripcash.com/documentation/api?tab=online_models_list
 *
 * These mirror the documented payload; the service (services/stripchat.ts)
 * narrows defensively at runtime and normalizes to the shared `Room` shape.
 */

/** Broadcast status. The grid only surfaces `public`. */
export type StripchatStatus = 'public' | 'groupShow' | 'p2p' | 'private' | 'off';

/** A single model as returned by `api/models`. All fields optional/defensive. */
export interface StripchatModel {
  username: string;
  /** Live viewers. */
  viewersCount?: number;
  /** Follower / popularity count. */
  favoritedCount?: number;
  /** Primary gender signal, e.g. "female" | "male" | "couple" | "trans". */
  broadcastGender?: string;
  /** Fallback gender signal. */
  gender?: string;
  /** ISO alpha-2 country code, lowercase (e.g. "co"). */
  modelsCountry?: string;
  /** Tags, may carry a niche prefix ("girls/latin"). */
  tags?: string[];
  /** Spoken languages (ISO-ish codes or names). */
  languages?: string[];
  /** Live snapshot (preferred thumbnail). */
  snapshotUrl?: string;
  /** "Best moment" snapshot (fallback thumbnail). */
  popularSnapshotUrl?: string;
  /** Small profile avatar (used when offline / no snapshot). */
  previewUrlThumbSmall?: string;
  /** Broadcasting in HD. */
  broadcastHD?: boolean;
  /** Broadcasting in VR (optional badge). */
  broadcastVR?: boolean;
  /** Broadcast status. */
  status?: StripchatStatus;
  /** Current goal / room subject (Chaturbate room_subject equivalent). */
  goalMessage?: string | null;
  /** Goal progress (urgency signal, optional). */
  neededForGoal?: number;
  earnedForGoal?: number;
  /** Whether the model is newly registered. */
  isNew?: boolean;
  /** Pre-built affiliate outbound link (fallback when no white label). */
  clickUrl?: string;
  /** Geo restrictions — already respected server-side by the simple API. */
  geobans?: unknown;
}

/** Top-level response of `api/models`. */
export interface StripchatModelsResponse {
  count?: number;
  total?: number;
  CDNHosts?: string[];
  CDNDefaultHost?: string;
  models?: StripchatModel[];
}
