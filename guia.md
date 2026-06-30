# Guía — Conectar xlugar.com con la API de Chaturbate

Esta guía explica **qué valores necesitás**, **de dónde sacarlos** y **cómo cargarlos**
(local + Netlify) para que el catálogo en vivo funcione.

---

## 0. El error que tenías (ya resuelto en código)

El endpoint devolvía:

```json
{ "errors": { "client_ip": [{ "message": "This field is required." }] } }
```

La API de afiliados **exige el parámetro `client_ip`** (lo usa para geo-bloqueo por país).
Faltaba en la request → 400 → el proxy devolvía 502.

**Ya está arreglado:** el proxy (`src/pages/api/rooms.ts`) ahora resuelve la IP del
visitante automáticamente:

1. Lee la IP real del visitante desde las cabeceras (`x-nf-client-connection-ip` en
   Netlify, o `x-forwarded-for`).
2. Si no hay una IP pública usable (p. ej. en `localhost`), manda el literal
   **`client_ip=request_ip`**, que le dice a Chaturbate que use la IP del servidor que
   hace la llamada.

➡️ **No tenés que setear ningún valor de `client_ip` a mano.** Funciona solo.

---

## 1. Valores que SÍ tenés que cargar

Todos van como variables de entorno. Las `PUBLIC_*` se inyectan en build y quedan
disponibles para el catálogo. Plantilla completa en [`.env.example`](.env.example).

| Variable | ¿Obligatoria para la API? | Valor |
|---|---|---|
| `PUBLIC_CHATURBATE_CAMPAIGN` | ✅ **Sí** | Tu campaign / web master tag: `R1cGT` |
| `PUBLIC_SITE_URL` | Sí (SEO) | `https://xlugar.com` |
| `PUBLIC_WHITELABEL_URL` | No (retención) | URL del White Label de tu cuenta |
| `PUBLIC_GA_MEASUREMENT_ID` | No (analytics) | `G-XXXXXXXXXX` |
| `PUBLIC_GTM_ID` | No (ads/tags) | `GTM-XXXXXXX` |

> Lo único **imprescindible para que la API devuelva modelos** es
> `PUBLIC_CHATURBATE_CAMPAIGN`. El resto es SEO/retención/analytics.

---

## 2. De dónde sacar cada valor

### 2.1 `PUBLIC_CHATURBATE_CAMPAIGN` (el `wm`) — **el que importa**

Es tu identificador de afiliado (revshare 20%). Ya lo tenés: **`R1cGT`**.

Para confirmarlo o si lo cambian:

1. Entrá a tu cuenta de afiliado: **https://chaturbate.com/affiliates/**
2. Menú lateral → **API** (o **"API & Tools" / "API Access"**).
3. Ahí aparece la URL de ejemplo del endpoint `onlinerooms`; el valor de
   **`?wm=XXXXX`** es tu campaign. Ese string es lo que va en
   `PUBLIC_CHATURBATE_CAMPAIGN`.
4. También lo ves en cualquier link de promo: el parámetro `campaign=` es el mismo valor.

> ⚠️ Nunca lo hardcodees en el código. Siempre por env var (ya está así).

### 2.2 `PUBLIC_WHITELABEL_URL` (opcional — destino de retención)

1. En el panel de afiliado: **Affiliate → White Labels** (o "Whitelabels").
2. Creá / abrí tu White Label. Te da una **URL base** (algo como
   `https://tu-marca.chaturbate.com/` o un dominio propio apuntado al WL).
3. Pegá esa URL base en `PUBLIC_WHITELABEL_URL`.
4. El código (`src/features/affiliate/utils/whiteLabel.ts`) le agrega solo el `campaign`
   y los UTM. Si lo dejás vacío, el botón "Enter live" cae al link de afiliado normal.

### 2.3 `PUBLIC_GA_MEASUREMENT_ID` (opcional — Google Analytics 4)

1. **https://analytics.google.com/** → Admin → **Data Streams** → tu stream web.
2. Copiá el **Measurement ID** con formato `G-XXXXXXXXXX`.

### 2.4 `PUBLIC_GTM_ID` (opcional — Google Tag Manager / ads)

1. **https://tagmanager.google.com/** → tu contenedor.
2. Copiá el **Container ID** con formato `GTM-XXXXXXX`.

---

## 3. Cómo cargarlos

### Local (desarrollo)

Editá el archivo `.env` en la raíz del repo (ya existe, está en `.gitignore`):

```bash
PUBLIC_SITE_URL=https://xlugar.com
PUBLIC_SITE_NAME=xLugar
PUBLIC_SITE_LOCALE=en_US
PUBLIC_CHATURBATE_CAMPAIGN=R1cGT
PUBLIC_WHITELABEL_URL=
PUBLIC_GA_MEASUREMENT_ID=
PUBLIC_GTM_ID=
```

Reiniciá el dev server después de cambiarlo:

```bash
npm run dev
```

### Netlify (producción)

**Site settings → Environment variables → Add a variable** (una por una), con los mismos
nombres y valores. Mínimo para que el catálogo funcione:

- `PUBLIC_SITE_URL`
- `PUBLIC_CHATURBATE_CAMPAIGN=R1cGT`

(`NODE_VERSION=20` ya está en `netlify.toml`.)

Volvé a desplegar (**Trigger deploy → Deploy site**) para que tome las variables.

---

## 4. Cómo verificar que funciona

Con el dev server corriendo:

```bash
# Debería devolver count > 0 y un array de rooms (NO error)
curl "http://localhost:4321/api/rooms?limit=5"
```

Respuesta esperada (resumida):

```json
{
  "count": 5,
  "rooms": [
    {
      "username": "...",
      "num_users": 41867,
      "current_show": "public",
      "image_url_360x270": "https://thumb.live.mmcdn.com/ri/....jpg",
      "chat_room_url_revshare": "https://chaturbate.com/in/?tour=...&campaign=R1cGT&...&room=..."
    }
  ]
}
```

Después abrí **http://localhost:4321/models** → tenés que ver el grid con fotos en vivo,
que se refresca cada 60s.

### Si todavía da error

El proxy ahora devuelve el motivo real en el campo `detail` y lo loguea en la terminal:

```json
{ "rooms": [], "error": "upstream_unavailable", "detail": "Chaturbate API responded 4xx ..." }
```

- `detail` menciona `client_ip` → no debería pasar (ya se manda solo); revisá que tengas
  la última versión del repo.
- `detail` dice `PUBLIC_CHATURBATE_CAMPAIGN is not set` → falta la env var (paso 2.1).
- `detail` con `wm`/`campaign` inválido → el campaign no es correcto; reconfirmalo en el
  panel (paso 2.1).

---

## 5. Notas de afiliado (no romper)

- El `client_ip` real del visitante se manda para que el **geo-bloqueo por país** funcione:
  cada modelo decide desde qué países se la puede ver. Mandar la IP correcta evita mostrar
  rooms que el usuario no podría abrir.
- Los links a modelos usan **siempre** el campo `chat_room_url_revshare` que entrega la API
  (no se reconstruyen a mano). Ese link trae `room=<username_de_la_modelo>` — eso es
  correcto y **paga revshare**. Lo prohibido es `room=xlugar` (tu propio room de
  broadcaster), que no aparece en ningún lado.
- El campaign nunca está hardcodeado: sale de `PUBLIC_CHATURBATE_CAMPAIGN`.
