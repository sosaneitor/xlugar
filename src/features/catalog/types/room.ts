/**
 * Types for the Chaturbate public affiliates "online rooms" API.
 * Endpoint: https://chaturbate.com/api/public/affiliates/onlinerooms/?wm={campaign}&format=json
 *
 * The live shape can't be fetched at build time from this environment, so these
 * mirror the documented payload and the service narrows defensively at runtime.
 */

export type Gender = 'f' | 'm' | 'c' | 't';
export type CurrentShow = 'public' | 'private' | 'group' | 'hidden' | 'away';

/** A single online room as returned by the affiliates API. */
export interface ChaturbateRoom {
  username: string;
  current_show: CurrentShow;
  num_users: number;
  num_followers: number;
  gender: Gender;
  location: string;
  /** ISO-ish country string, sometimes more specific than `location`. */
  country: string;
  /** Display age; may be absent for some rooms. */
  age?: number;
  birthday?: string;
  is_new: boolean;
  /** Broadcasting in HD. */
  is_hd: boolean;
  tags: string[];
  /** 320x180 JPEG snapshot, refreshed ~every 60s (not live video). */
  image_url: string;
  /** Larger 360x270 snapshot. */
  image_url_360x270?: string;
  room_subject: string;
  /** Comma-separated language list, e.g. "English, Spanish". */
  spoken_languages: string;
  seconds_online: number;
  /** Pre-built Revshare affiliate link for THIS room. Always use this for links. */
  chat_room_url_revshare: string;
  /** Non-affiliate room URL (do not use for outbound links). */
  chat_room_url?: string;
}

/** Top-level response. The API returns `{ results: [...] }`; tolerate a bare array. */
export interface OnlineRoomsResponse {
  count?: number;
  results: ChaturbateRoom[];
}

/** Filters applied client-side over the fetched snapshot. */
export interface RoomFilters {
  /** Single tag to require (case-insensitive). */
  tag?: string;
  gender?: Gender;
  /** Substring match against spoken_languages (case-insensitive). */
  language?: string;
  /** Minimum viewer count. */
  minViewers?: number;
}
