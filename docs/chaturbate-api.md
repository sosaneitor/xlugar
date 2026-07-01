# Chaturbate Affiliate API — reference for xLugar

How xLugar consumes Chaturbate data and which parts of the affiliate API we
leverage. All room data comes from a **single public endpoint** — no secret API
key is required, only the affiliate campaign tag (`wm`).

## Online rooms endpoint

```
GET https://chaturbate.com/api/public/affiliates/onlinerooms/
```

Proxied through our own serverless function at `/api/rooms` (see
[`src/pages/api/rooms.ts`](../src/pages/api/rooms.ts)) so the browser never calls
Chaturbate directly and we can cache/normalize/rank the response.

### Query parameters

| Param | Required | Values | Notes |
|-------|----------|--------|-------|
| `wm` | ✅ | affiliate campaign tag (e.g. `R1cGT`) | From `PUBLIC_CHATURBATE_CAMPAIGN`. Empty ⇒ API rejects. |
| `format` | – | `json` | We always send `json`. |
| `client_ip` | ✅ | visitor IP or `request_ip` | Geo/compliance. `request_ip` = let CB use the requester (our function) IP. The proxy forwards the real visitor IP when available. |
| `region` | – | `northamerica`, `southamerica`, `europe_russia`, `asia`, `africa`, `other` | **Server-side geo filter.** `southamerica` returns overwhelmingly Colombian rooms (~75% `country: "CO"` in testing). This is our main lever for LatAm focus. |
| `gender` | – | `f`, `m`, `c`, `t` | **Server-side filter** — verified: `gender=m` returns only males. Preferred over post-fetch filtering. |
| `limit` | – | integer | Verified up to `200`+ (NOT capped at 90). Larger = bigger pool for tag/country filtering, but heavier payload. We default to `PUBLIC_ROOMS_LIMIT`. |

Example (LatAm pool, Colombia-heavy):

```
https://chaturbate.com/api/public/affiliates/onlinerooms/?wm=R1cGT&format=json&limit=300&client_ip=request_ip&region=southamerica
```

### Response fields (per room)

Verified present in the live payload:

```
username, display_name, slug, gender, current_show,
num_users, num_followers, age, birthday,
country (ISO alpha-2, e.g. "CO"), location, spoken_languages,
tags[], room_subject, is_hd, is_new, seconds_online,
image_url, image_url_360x270,
chat_room_url, chat_room_url_revshare,
iframe_embed, iframe_embed_revshare
```

Notes:
- `country` is an **ISO alpha-2 code** (`CO`, `BR`, `AR`, `VE`, `MX`), sometimes
  empty — NOT a full country name. Map to a flag with
  `src/features/catalog/utils/country.ts`.
- Always link out via `chat_room_url_revshare` (pays commission); never
  `chat_room_url`.
- `iframe_embed_revshare` is available if we ever want an inline live preview.

## Affiliate link tours

Static promo links (home CTAs, category tours) use `/in/?tour=...&campaign=...`,
built in [`src/features/affiliate/utils/affiliate.ts`](../src/features/affiliate/utils/affiliate.ts).
Tour IDs are campaign-specific.

## Stats / earnings API — OPTIONAL, requires access (NOT used yet)

Chaturbate exposes an authenticated **statistics API** (impressions, clicks,
signups, revenue) intended for affiliate dashboards. It is **not needed for the
landing/catalog** and is not implemented. If we ever build an internal earnings
dashboard, it would require a token/key issued from the affiliate portal
(Affiliate → API / stats), stored as a **non-public secret** env var:

```
# Secret — do NOT prefix with PUBLIC_ (would be inlined into client bundles).
# CHATURBATE_STATS_TOKEN=
```

Until then, leave it blank/commented. Request the key from the Chaturbate
affiliate account settings if this feature is prioritized.

## Environment variables

See [`.env.example`](../.env.example). Relevant to the API:

- `PUBLIC_CHATURBATE_CAMPAIGN` — the `wm` tag (required).
- `PUBLIC_DEFAULT_REGION` — default `region` for the whole catalog (`southamerica`).
- `PUBLIC_PRIORITY_COUNTRY` — ISO code ranked first in the grid (`CO`).
- `PUBLIC_ROOMS_LIMIT` — pool size requested from CB (e.g. `300`).
