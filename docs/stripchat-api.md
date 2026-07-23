# Stripchat / Stripcash API (team reference)

Resumen operativo de cómo xLugar consume la API de **Stripcash** para mezclar
modelos de **Stripchat** con los de Chaturbate en el grid híbrido. Plan completo:
[`stripchat-integration-plan.md`](./stripchat-integration-plan.md).
Docs oficiales: <https://stripcash.com/documentation/api?tab=online_models_list>

## Endpoint usado

API **"Links & Creatives"** (la simple: solo requiere `userId`, sin API key).

```
Lista:        {PUBLIC_STRIPCHAT_API_BASE}/api/models?userId={userId}&{filtros}
Solo online:  {PUBLIC_STRIPCHAT_API_BASE}/api/models/online?userId={userId}
Diccionarios: {PUBLIC_STRIPCHAT_API_BASE}/api/dicts
```

- Base por defecto: `https://go.whitetrafsa.com` (confírmala en tu panel con sesión).
- **No** usamos la Aggregators API (`models-ext`): exige API key, base de datos y
  filtrado geo manual. Queda como posible fase 2 (SEO / perfiles indexables).
- Geobans y "solo públicos" los resuelve la API simple según la IP del visitante
  (por eso el proxy reenvía la IP real, igual que con Chaturbate).

## Variables de entorno (`.env` / Netlify)

| Var                              | Uso                                                      |
|----------------------------------|----------------------------------------------------------|
| `PUBLIC_STRIPCHAT_ENABLED`       | `1` incluye Stripchat en el grid; `0`/vacío lo apaga.    |
| `PUBLIC_STRIPCHAT_USER_ID`       | Tu userId de afiliado (obligatorio). Nunca hardcodear.   |
| `PUBLIC_STRIPCHAT_API_BASE`      | Host base del API. Sin barra final.                      |
| `PUBLIC_STRIPCHAT_WHITELABEL_URL`| White label de salida (`cams.xlugar.com`). Vacío = `clickUrl`. |
| `PUBLIC_STRIPCHAT_MIX_RATIO`     | Opcional 0..1: cuota de tarjetas SC. Vacío = sin cuota.  |

> Los `PUBLIC_*` se inlinean en build. La fuente queda **apagada** hasta que
> `PUBLIC_STRIPCHAT_ENABLED=1` **y** `PUBLIC_STRIPCHAT_USER_ID` tenga valor.

## Parámetros de `api/models` que enviamos

| Filtro xLugar          | Param Stripchat                        |
|------------------------|----------------------------------------|
| género (`f/m/c/t`)     | `tag=girls\|men\|couples\|trans`       |
| categoría/tag          | `tag=...` (gana sobre el de género)    |
| país                   | `modelsCountry=co` (minúsculas)        |
| idioma / región LatAm  | `modelsLanguage=es` (ISO)              |
| solo nuevos (`sort=new`)| `isNew=1`                             |
| límite                 | `limit=N` (máx 1000)                   |
| filtros estrictos      | `strict=1`                             |
| userId (obligatorio)   | `userId={PUBLIC_STRIPCHAT_USER_ID}`    |

La API simple no tiene param de "región", así que en el proxy mapeamos la pestaña
de región a un `modelsLanguage` aproximado (LatAm → `es`, N. América → `en`); el
resto queda como pool global y luego lo reordena `rankRooms`.

## Mapeo respuesta → `Room` (shape común)

Implementado en [`src/features/catalog/services/stripchat.ts`](../src/features/catalog/services/stripchat.ts).

| `Room` (común)            | Origen Stripchat                                    |
|---------------------------|-----------------------------------------------------|
| `source`                  | `'stripchat'`                                       |
| `username` / `display_name`| `username`                                         |
| `num_users`               | `viewersCount`                                      |
| `num_followers`           | `favoritedCount`                                    |
| `gender`                  | `broadcastGender`/`gender` → `f/m/c/t`              |
| `country`                 | `modelsCountry.toUpperCase()`                       |
| `is_hd`                   | `broadcastHD`                                       |
| `is_new`                  | `isNew`                                             |
| `tags`                    | `tags` sin prefijo de nicho (`girls/latin`→`latin`) |
| `image_url`               | `snapshotUrl` (o `previewUrlThumbSmall`)            |
| `image_url_360x270`       | `popularSnapshotUrl` ?? `snapshotUrl`               |
| `room_subject`            | `goalMessage ?? ''`                                 |
| `spoken_languages`        | `languages.join(', ')`                              |
| `seconds_online`          | `0` (no expuesto; orden "new" vía `isNew`)          |
| `current_show`            | `public` / `group` / `private` según `status`       |
| `chat_room_url_revshare`  | `clickUrl`; si la API no lo trae, se construye `{API_BASE}/{username}?userId=...` |

Solo se muestran modelos con `status === 'public'`.

**Mapeo de género** (Chaturbate usa `f/m/c/t`):

```
female / girls               → 'f'
male   / men                 → 'm'
couples / group / maleFemale → 'c'
trans                        → 't'
```

## Merge en el proxy

[`src/pages/api/rooms.ts`](../src/pages/api/rooms.ts) consulta ambas fuentes con
`Promise.allSettled` → si una cae, el grid sigue con la otra. Luego:

- Sin `MIX_RATIO`: se juntan ambos pools y `rankRooms` produce un orden único
  (país prioritario → hispanohablante/LatAm → resto; dentro por viewers).
- Con `MIX_RATIO` (0..1): cada fuente se rankea por separado y se intercalan en
  esa proporción, preservando el orden interno de cada una.

Caché: `s-maxage=30`, una llamada por ciclo (no por visitante) → respeta el rate
limit. **Imágenes:** siempre por URL directa; nunca descargar ni alojar.

## Enlaces de salida

[`src/features/affiliate/utils/stripchatWhiteLabel.ts`](../src/features/affiliate/utils/stripchatWhiteLabel.ts)
enruta a `cams.xlugar.com/{username}/?userId=...`. Si el white label no está
configurado, cae al `clickUrl` que ya trae afiliación. Mantener siempre
`rel="sponsored noopener noreferrer"` y `target="_blank"`.

> **Pendiente de confirmar en el panel de Stripcash:** el formato exacto del
> deep-link del white label (path `/{username}` vs. query, y si el `userId` va en
> query o incrustado en el dominio). Ajustar `buildStripchatRoomLink` si difiere.
