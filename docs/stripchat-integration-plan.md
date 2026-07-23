# Plan de integración Stripchat (híbrido con Chaturbate)

> Objetivo: mostrar modelos de **Stripchat** junto a los de **Chaturbate** en un
> **grid unificado mezclado**, enrutando los clics de salida a tu white label
> **cams.xlugar.com** para generar tráfico y comisiones de Stripchat.
>
> Este documento es un plan de implementación. No modifica código todavía.
> Referencia de la API: https://stripcash.com/documentation/api?tab=online_models_list

---

## 1. Resumen de la decisión

- **Fuente de datos:** `api/models` (la API "Links & Creatives", la simple con
  `userId`), **no** la API de agregadores (`models-ext`). Ver §2.
- **UI:** un único grid que mezcla ambas plataformas, ordenadas juntas. Cada
  tarjeta lleva una etiqueta pequeña de plataforma (CB / SC).
- **Salida:** los clics de modelos de Stripchat van a `cams.xlugar.com/{username}`
  (tu white label), con el `userId` de afiliado. Fallback al `clickUrl` que
  devuelve la API si el white label no está configurado.
- **Sin base de datos.** Se mantiene el patrón actual: proxy serverless
  (`/api/rooms`) que consulta en vivo y cachea 30 s. Igual que hoy con Chaturbate.

---

## 2. Qué endpoint usar y por qué

Stripcash ofrece dos APIs. Elegimos la **simple** por compatibilidad con la
arquitectura actual de xLugar (sin estado, sin DB).

### 2.1 `api/models` — Links & Creatives (ELEGIDA)

```
Base:        https://go.whitetrafsa.com
Lista:       https://go.whitetrafsa.com/api/models?userId={userId}&{filtros}
Solo online: https://go.whitetrafsa.com/api/models/online?userId={userId}
Diccionarios:https://go.whitetrafsa.com/api/dicts
```

Ventajas para nuestro caso:

- Solo requiere `userId` (tu ID de afiliado). **No** necesita API key ni header
  `Authorization`. Es el equivalente directo de `onlinerooms` de Chaturbate.
- **Filtra geobans automáticamente** según el país del visitante y devuelve por
  defecto solo streams públicos → cumplimiento resuelto del lado de Stripchat.
- El campo `clickUrl` ya viene con tu afiliación (equivalente a
  `chat_room_url_revshare` de Chaturbate).
- Encaja con el proxy `/api/rooms` actual y su caché de 30 s.

> `go.whitetrafsa.com` es el host de tu cuenta de afiliado tal como aparece en la
> documentación con tu sesión iniciada. Confírmalo en el panel de Stripcash antes
> de codificar y guárdalo en env (`PUBLIC_STRIPCHAT_API_BASE`), nunca hardcodeado.

### 2.2 `models-ext/models` — Aggregators API (descartada por ahora)

```
https://go.whitetrafsa.com/app/models-ext/models?userId={userId}
Header: Authorization: Bearer {api_key}
Rate limit: 1 request / 5 s
```

Más potente (ordenamiento custom, TODOS los estados incluidos privados, sin
filtro geo). Pero impone obligaciones pesadas que hoy no queremos:

- Requiere **API key por dominio** y header Bearer.
- **Tú** debes filtrar geobans por país/región del visitante (no lo hace la API).
- Exige **guardar los modelos en una base de datos**, refrescar cada 30 s, y
  **eliminar** todo contenido de un modelo que no aparezca en 30 días (o usar el
  endpoint `models-ext/models/deleted` para limpieza proactiva).

Recomendación: dejarla como **fase 2** si más adelante se quiere un sitio
agregador con páginas de perfil indexables (SEO) por modelo. Para el grid en vivo
actual, la API simple es suficiente.

---

## 3. Forma de la respuesta (`api/models`)

Objeto raíz: `{ count, total, CDNHosts, CDNDefaultHost, models[] }`.

Campos relevantes de cada `model` (los que usaremos):

| Campo Stripchat        | Tipo             | Uso en xLugar                                   |
|------------------------|------------------|-------------------------------------------------|
| `username`             | string           | identidad + slug + deep-link white label        |
| `viewersCount`         | integer          | espectadores en vivo (orden por viewers)        |
| `favoritedCount`       | integer          | seguidores / popularidad                        |
| `broadcastGender`      | string           | mapeo de género (ver §4.2)                       |
| `gender`               | string           | respaldo de género                              |
| `modelsCountry`        | string (cc)      | país (código, p.ej. "co")                        |
| `tags`                 | string[]         | tags con prefijo de nicho ("girls/latin")        |
| `languages`            | string[]         | idiomas hablados                                |
| `snapshotUrl`          | string           | miniatura EN VIVO (preferida)                    |
| `popularSnapshotUrl`   | string           | miniatura "mejor momento" (respaldo)             |
| `previewUrlThumbSmall` | string           | avatar de perfil (para offline)                  |
| `broadcastHD`          | boolean          | badge HD                                         |
| `broadcastVR`          | boolean          | badge VR (opcional)                              |
| `status`              | string           | "public" / "groupShow" / "p2p" / "private"      |
| `goalMessage`          | string \| null   | asunto de la sala (equivalente a room_subject)   |
| `neededForGoal`/`earnedForGoal` | integer | progreso de goal (urgencia, orden avanzado)     |
| `clickUrl`             | string           | enlace de salida afiliado (fallback)             |
| `geobans`              | object           | restricciones geo (respetadas por la API simple) |

> **Imágenes:** usar las URLs directamente en `<img src>`. **No descargar ni
> alojar** las imágenes (regla de Stripcash). Ya es el patrón de `RoomCard`.

---

## 4. Arquitectura: tipo `Room` unificado

Hoy todo el catálogo usa `ChaturbateRoom`. Para mezclar dos fuentes sin reescribir
`LiveCatalog`/`RoomCard`, añadimos un discriminador `source` y **normalizamos
Stripchat al mismo shape**.

### 4.1 Cambio de tipo (`src/features/catalog/types/room.ts`)

Añadir un campo a la interfaz existente (renombre conceptual a `Room`, alias
mantenido para no romper imports):

```ts
export type RoomSource = 'chaturbate' | 'stripchat';

export interface Room extends /* campos actuales de ChaturbateRoom */ {
  /** Plataforma de origen. Discrimina el enrutado del enlace y el badge. */
  source: RoomSource;
}

// Compat: mantener el nombre viejo mientras se migra.
export type ChaturbateRoom = Room;
```

En `chaturbate.ts` → `normalizeRoom()` añadir `source: 'chaturbate'`.

### 4.2 Mapeo Stripchat → `Room`

Nuevo archivo `src/features/catalog/services/stripchat.ts`:

| Room (común)              | Origen Stripchat                                             |
|---------------------------|-------------------------------------------------------------|
| `source`                  | `'stripchat'`                                               |
| `username`                | `username`                                                  |
| `display_name`            | `username` (Stripchat no da display name separado)         |
| `num_users`               | `viewersCount`                                              |
| `num_followers`           | `favoritedCount`                                            |
| `gender`                  | mapeo (abajo)                                               |
| `country`                 | `modelsCountry.toUpperCase()`                               |
| `is_hd`                   | `broadcastHD`                                               |
| `is_new`                  | `false` por defecto (usar `isNew=1` al pedir "nuevos")     |
| `tags`                    | `tags` sin prefijo de nicho: `"girls/latin"` → `"latin"`   |
| `image_url`               | `snapshotUrl` (o `previewUrlThumbSmall` si vacío)          |
| `image_url_360x270`       | `popularSnapshotUrl` ?? `snapshotUrl`                       |
| `room_subject`            | `goalMessage ?? ''`                                         |
| `spoken_languages`        | `languages.join(', ')`                                      |
| `seconds_online`          | `0` (Stripchat no lo expone → orden "new" vía `isNew`)     |
| `current_show`            | `status==='public' ? 'public' : (mapa a private/group)`    |
| `chat_room_url_revshare`  | `clickUrl` (fallback de enlace)                            |
| `age`                     | `undefined` (no disponible)                                 |

**Mapeo de género** (Chaturbate usa `f/m/c/t`):

```
female / girls           → 'f'
male   / men             → 'm'
couples / group / maleFemale → 'c'
trans                    → 't'
```

Al pedir por género a Stripchat se usa el parámetro `tag` de nicho:
`girls | men | couples | trans` (no el mismo nombre que Chaturbate).

**Solo modelos mostrables:** filtrar `status === 'public'` (igual que el filtro
`current_show === 'public'` de Chaturbate) salvo que se decida mostrar goalShow.

---

## 5. Parámetros de `api/models` que usaremos

De la documentación, mapeo de nuestros filtros actuales a params de Stripchat:

| Filtro xLugar        | Param Stripchat                                  |
|----------------------|--------------------------------------------------|
| género               | `tag=girls\|men\|couples\|trans`                 |
| país prioritario     | `modelsCountry=co` (código en minúsculas)        |
| idioma               | `modelsLanguage=es` (códigos ISO)                |
| solo nuevos ("new")  | `isNew=1`                                         |
| solo HD              | `broadcastHD=1`                                   |
| límite               | `limit=N` (máx 1000)                              |
| categoría/tag        | `tag=girls/latin` etc.                            |
| userId (obligatorio) | `userId={PUBLIC_STRIPCHAT_USER_ID}`              |

Notas:

- `tag=girls` es el valor por defecto si no se especifica.
- Para priorizar LatAm/Colombia (nuestra audiencia) usar
  `modelsCountry=co` y/o `modelsLanguage=es`, y reforzar con el ranking propio (§6).
- `strict=1` fuerza que se cumplan los filtros de forma estricta.

---

## 6. Grid unificado: fetch, merge y ranking

### 6.1 Proxy (`src/pages/api/rooms.ts`)

Hoy llama solo a `fetchRooms()` (Chaturbate). Se amplía a:

```ts
const [cb, sc] = await Promise.allSettled([
  fetchRooms({ ...opts }),          // Chaturbate (existente)
  fetchStripchatRooms({ ...opts }), // Stripchat (nuevo)
]);
const pool = [
  ...(cb.status === 'fulfilled' ? cb.value : []),
  ...(sc.status === 'fulfilled' ? sc.value : []),
];
const rooms = rankRooms(pool, { sort });   // rankRooms ya existe
```

- `Promise.allSettled` → si una plataforma falla, el grid sigue con la otra
  (degradación elegante, igual que hoy). Loggear el error del lado que falle.
- Añadir un flag `PUBLIC_STRIPCHAT_ENABLED`; si está apagado, no se llama a SC.
- Respetar la caché actual (`s-maxage=30`). Stripchat refresca cada ~30 s, así que
  encaja. No superar el rate limit (una request por render/caché, no por usuario).

### 6.2 Ranking

`rankRooms()` ya ordena por tiers: (1) país prioritario (CO), (2) hispanohablante
o tag LatAm, (3) resto; y dentro de cada tier por viewers. **Funciona igual para
ambas fuentes** una vez normalizadas, así que la mezcla queda ordenada de forma
coherente. Solo hay que asegurarse de que:

- `rankRooms` opere sobre `Room` (no `ChaturbateRoom`) — es solo el tipo.
- El orden "new" (`seconds_online`) degrada para Stripchat (siempre 0); para "new"
  real de Stripchat se pide `isNew=1` y se colocan esos primero.

### 6.3 Balance de fuentes (opcional pero recomendado)

Para que una plataforma no ahogue a la otra, opción de intercalar o aplicar una
cuota. Ejemplo simple con `PUBLIC_STRIPCHAT_MIX_RATIO` (p.ej. 0.4 = 40% Stripchat):
tras rankear cada fuente por separado, intercalar en proporción antes de paginar.
Empezar sin cuota (mezcla pura por viewers) y ajustar según conversión.

---

## 7. Enlaces de salida → white label `cams.xlugar.com`

Nuevo archivo `src/features/affiliate/utils/stripchatWhiteLabel.ts`, análogo a
`whiteLabel.ts` de Chaturbate.

```ts
const SC_WL = (import.meta.env.PUBLIC_STRIPCHAT_WHITELABEL_URL ?? '').trim();
const SC_USER = (import.meta.env.PUBLIC_STRIPCHAT_USER_ID ?? '').trim();

export const hasStripchatWL = SC_WL.length > 0;

/** Deep-link a la sala del modelo en el white label. */
export function buildStripchatRoomLink(username: string, clickUrl: string): string {
  if (!hasStripchatWL) return clickUrl;         // fallback: clickUrl afiliado
  const base = SC_WL.endsWith('/') ? SC_WL : `${SC_WL}/`;
  const url = new URL(encodeURIComponent(username) + '/', base);
  if (SC_USER) url.searchParams.set('userId', SC_USER);
  // añadir aquí params de tracking/campaña que use tu white label
  return url.href;
}
```

En `RoomCard` (dentro de `LiveCatalog.tsx`), el `href` se decide por `source`:

```ts
const href = room.source === 'stripchat'
  ? buildStripchatRoomLink(room.username, room.chat_room_url_revshare)
  : buildRoomLink(room.username, room.chat_room_url_revshare, 'catalog'); // CB actual
```

> **Confirmar el formato de deep-link del white label** de Stripchat: normalmente
> `https://cams.xlugar.com/{username}`. Verifica en el panel de white labels de
> Stripcash cómo se pasa el `userId`/tracking (query param vs. incrustado en el
> dominio) y ajusta `buildStripchatRoomLink` en consecuencia. Si el WL ya lleva tu
> afiliación incrustada, igual conviene forzar `userId` para atribución.

Mantener `rel="sponsored noopener noreferrer"` y `target="_blank"` como hoy.

---

## 8. Cambios en la UI

- **Badge de plataforma** en `RoomCard`: pequeño pill (p.ej. "SC" magenta /
  "CB"), junto a los badges LIVE/HD/New existentes. Útil para transparencia y
  medición; se puede ocultar si se prefiere una marca unificada.
- Los filtros existentes (género, región, idioma, viewers, HD, new) siguen
  funcionando porque operan sobre el `Room` normalizado. Verificar el mapeo de
  región: Chaturbate usa `region` (northamerica...); Stripchat usa
  `modelsCountry`/`modelsLanguage`. En el proxy, traducir la pestaña de región a
  los países correspondientes para Stripchat (p.ej. LatAm → `modelsCountry` de
  varios países, o simplemente `modelsLanguage=es`).
- El contador "X live" y `ColombiaCounter` seguirán sumando ambas fuentes.

---

## 9. Variables de entorno nuevas (`.env` y `.env.example`)

```bash
# --- Stripchat / Stripcash (api/models) ---
# Activa/desactiva la fuente Stripchat en el grid híbrido.
PUBLIC_STRIPCHAT_ENABLED=1
# Tu userId de afiliado de Stripcash (del enlace por defecto). NUNCA hardcodear.
PUBLIC_STRIPCHAT_USER_ID=
# Base del API tal como aparece en tu panel (con sesión). Sin barra final.
PUBLIC_STRIPCHAT_API_BASE=https://go.whitetrafsa.com
# White label de retención para los clics de Stripchat.
PUBLIC_STRIPCHAT_WHITELABEL_URL=https://cams.xlugar.com
# Opcional: proporción de tarjetas Stripchat en la mezcla (0..1). Vacío = sin cuota.
PUBLIC_STRIPCHAT_MIX_RATIO=
```

Recordar: los `PUBLIC_*` se inlinean en build. Configurar los mismos valores en
Netlify antes de desplegar (igual que las vars de Chaturbate).

---

## 10. Archivos a crear / modificar

**Crear:**

- `src/features/catalog/types/stripchat.ts` — tipos crudos de la respuesta API.
- `src/features/catalog/services/stripchat.ts` — `fetchStripchatRooms()` + `normalizeStripchatModel()`.
- `src/features/affiliate/utils/stripchatWhiteLabel.ts` — enlaces a `cams.xlugar.com`.
- `docs/stripchat-api.md` — referencia de la API (resumen de §2–§5) para el equipo.

**Modificar:**

- `src/features/catalog/types/room.ts` — añadir `source` + tipo `Room` (+alias compat).
- `src/features/catalog/services/chaturbate.ts` — `source:'chaturbate'` en `normalizeRoom`; `rankRooms` tipado a `Room`.
- `src/pages/api/rooms.ts` — fetch de ambas fuentes con `Promise.allSettled` + merge + flag.
- `src/features/catalog/components/LiveCatalog.tsx` — enrutado de `href` por `source`; badge de plataforma; mapeo de región→params Stripchat.
- `src/features/catalog/hooks/useRooms.ts` — sin cambios funcionales (consume el mismo `/api/rooms`); revisar tipos.
- `.env` y `.env.example` — vars de §9.

---

## 11. Cumplimiento y buenas prácticas

- **Geobans:** con `api/models` (simple) Stripchat ya oculta modelos vetados
  según el país del visitante. Pasar la IP real del visitante al proxy (igual que
  hoy con `client_ip` de Chaturbate) para que el geo-filtrado sea correcto.
  Si algún día se migra a la Aggregators API, habrá que filtrar geobans
  manualmente por `blockedCountries/blockedRegions/blockedLanguages`.
- **Imágenes:** usar URLs directas, no descargar ni cachear localmente.
- **Solo públicos:** filtrar `status='public'` para el grid (mejor conversión y
  evita mostrar salas de pago como si fueran gratis).
- **2257 / DMCA / edad:** las páginas legales ya existen (`/2257`, `/dmca`, etc.).
  Revisar que el texto cubra también a Stripchat como fuente de contenido.
- **Rate limit:** una llamada por ciclo de caché (30 s), no por visitante. El
  proxy + `s-maxage=30` ya lo garantiza.
- **Player (futuro):** si más adelante se **incrustan** streams (no solo enlazar),
  Stripcash migra los HLS al **Stripcash Player oficial antes del 31 ago 2026**;
  usar `StripchatPlayer({ modelName, userId, strict:1, autoplay })`. Para el grid
  actual (solo enlaces de salida) esto no aplica todavía.

---

## 12. Checklist de implementación

1. [ ] Confirmar `userId`, host base (`go.whitetrafsa.com`) y formato de deep-link
       del white label `cams.xlugar.com` en el panel de Stripcash.
2. [ ] Añadir vars de entorno (§9) en `.env` local y en Netlify.
3. [ ] Crear tipos crudos `types/stripchat.ts`.
4. [ ] Crear `services/stripchat.ts` con fetch + normalización (§4.2).
5. [ ] Añadir `source` al tipo `Room` y a `normalizeRoom` de Chaturbate.
6. [ ] Crear `utils/stripchatWhiteLabel.ts`.
7. [ ] Ampliar `/api/rooms` a merge de ambas fuentes con `allSettled` + flag.
8. [ ] Enrutar `href` por `source` y añadir badge de plataforma en `RoomCard`.
9. [ ] Mapear pestañas de región/idioma a params de Stripchat.
10. [ ] Probar en local: grid mezclado, filtros, clics a `cams.xlugar.com`, caída
        de una fuente sin romper la otra.
11. [ ] Validar cumplimiento (geobans por IP, solo públicos, imágenes por URL).
12. [ ] Deploy a Netlify con las env vars configuradas.

---

## 13. Datos confirmados del panel (2026-07-22)

Verificados navegando el panel de Stripcash con sesión iniciada (cuenta `xlugar`):

- **`userId` de afiliado:**
  `545075373e04db2cfe068b7003198f96ebed67f056dc29c9cab06c3440e671cb`
  Fuente: *Enlaces y anuncios → Constructor de enlaces → URL final*
  (`https://go.whitetrafsa.com?userId=545075...`).
  Ya está puesto en `.env` (`PUBLIC_STRIPCHAT_USER_ID`).
- **Host base del API confirmado:** `https://go.whitetrafsa.com` (coincide con la
  URL final del enlace por defecto).
- **White label `cams.xlugar.com`: estado DRAFT.** DNS *Complete*, Documents
  *Complete*, **Customization *Incomplete*** → aún no enviado a aprobación, no
  está activo. Los clics a `cams.xlugar.com/{username}` **todavía no resuelven**.
  - Por eso `PUBLIC_STRIPCHAT_WHITELABEL_URL` se dejó **vacío** en `.env`: los
    enlaces de salida usan el `clickUrl` del API (funciona y paga comisión).
  - Formato esperado una vez aprobado: `https://cams.xlugar.com/{username}`
    (los WL de Stripchat replican la estructura de stripchat.com; la atribución
    va ligada al dominio del WL). Restaurar la var y validar el formato exacto
    cuando el WL esté aprobado y live.

### Pasos para completar el white label (acción tuya en el panel)

1. Whitelabels → `cams.xlugar.com` → **Gestionar** → completar **Customize**.
2. **Enviar para aprobación** y esperar el OK de Stripcash.
3. Cuando esté *live*, restaurar en `.env` y Netlify:
   `PUBLIC_STRIPCHAT_WHITELABEL_URL=https://cams.xlugar.com`.

## 14. Decisiones abiertas (opcional, ajustables sin bloquear el lanzamiento)

- ¿Mostrar badge de plataforma (CB/SC) o marca totalmente unificada?
- ¿Incluir goalShow/groupShow o solo `public` en el grid?
- ¿Cuota de mezcla inicial (`MIX_RATIO`) o mezcla pura por viewers?
