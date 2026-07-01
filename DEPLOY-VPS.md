# Deploy de xLugar en VPS con Git + auto-deploy en `main`

- **VPS:** `2.25.75.17` · usuario `root` · Ubuntu 24.04.4 LTS · 1 vCPU · 3.8 GB RAM
- **Repo:** `github.com/sosaneitor/xlugar` · rama `main`
- **Modelo:** el código vive en el VPS como clon de git. Cada push a `main` dispara un
  **GitHub Action** que entra por SSH, hace `git pull`, compila y reinicia con pm2.

> **Orden recomendado:** Parte 1 (deja el sitio andando por IP y lo pruebas) → Parte 2
> (auto-deploy) → Parte 3 (dominio + HTTPS, opcional). Puedes quedarte en IP todo el tiempo que quieras.

---

## Estado actual del VPS (ya hecho)

✅ Instalado: **Node 20.20.2**, **npm 10.8.2**, **nginx 1.24.0**, **certbot 2.9.0**, **pm2 7.0.3**
⚠️ En `/var/www/xlugar` hay una copia del código subida a mano (SIN git). La **Parte 1 la reemplaza por un clon de git** — antes rescatamos el `.env`.

Conéctate con: `ssh root@2.25.75.17` (contraseña de root). Los comandos de Partes 1 y 3 se ejecutan **dentro del VPS**.

---

## Parte 0 — Subir tu código a GitHub (desde tu PC)

En tu PC, asegúrate de que todo está en `main` y subido:

```bash
cd /c/Users/sss_s/proyect/u/xlugar
git add -A
git commit -m "chore: age gate, cookie consent, node adapter, deploy config"
git push origin main
```

> Incluye `DEPLOY-VPS.md`, `.github/workflows/deploy.yml`, el adaptador Node en `astro.config.mjs`
> y las páginas legales. El `.env` NO se sube (está en `.gitignore`) — lo pondremos a mano en el VPS.

---

## Parte 1 — Primer deploy manual (dejarlo andando por IP)

### 1.1 Rescatar el `.env` y clonar el repo

```bash
# Guardar el .env que ya subimos, antes de borrar la carpeta
cp /var/www/xlugar/.env /root/xlugar.env.bak

# Reemplazar la copia manual por un clon de git.
# OJO: la rama por defecto del repo NO es main, así que clonamos main explícitamente
# (main es la rama con el adaptador Node y las páginas legales).
rm -rf /var/www/xlugar
git clone -b main https://github.com/sosaneitor/xlugar.git /var/www/xlugar

# Restaurar el .env (NO está en git)
cp /root/xlugar.env.bak /var/www/xlugar/.env
```

> **Si el repo es privado**, el `git clone` pedirá credenciales. Lo más simple: hazlo público,
> o usa un Personal Access Token: `git clone https://TU_USUARIO:TU_TOKEN@github.com/sosaneitor/xlugar.git /var/www/xlugar`.

### 1.2 Instalar dependencias y compilar

```bash
cd /var/www/xlugar
npm ci
DEPLOY_TARGET=node npm run build
ls -la dist/server/entry.mjs      # debe existir
```

> Si `npm ci` falla compilando algo nativo: `apt-get install -y build-essential && npm ci`.
> Si el build se queda sin RAM: `NODE_OPTIONS=--max-old-space-size=1024 DEPLOY_TARGET=node npm run build`.

### 1.3 Arrancar con pm2 (localhost:4321)

```bash
cd /var/www/xlugar
HOST=127.0.0.1 PORT=4321 pm2 start dist/server/entry.mjs --name xlugar
pm2 save
pm2 startup systemd -u root --hp /root
#  ^ imprime una línea "sudo env ...": cópiala, ejecútala, y repite:  pm2 save

pm2 status                        # "xlugar" -> online
curl -I http://127.0.0.1:4321     # -> HTTP/1.1 200 OK
```

### 1.4 nginx como reverse proxy (por IP, HTTP)

```bash
cat > /etc/nginx/sites-available/xlugar <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/xlugar /etc/nginx/sites-enabled/xlugar
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 1.5 Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

### ✅ PRUEBA POR IP
Abre en el navegador → **http://2.25.75.17**
Debes ver el **age gate 18+**; al entrar aparece el banner de cookies.

> El catálogo en vivo (`/api/rooms`) llama a la API de Chaturbate desde el VPS (que sí tiene
> salida a internet). Si el grid queda vacío, mira `pm2 logs xlugar` al recargar y avísame.

---

## Parte 2 — Auto-deploy en cada push a `main` (GitHub Actions)

El workflow ya está en el repo: `.github/workflows/deploy.yml`. Solo falta darle acceso SSH al VPS.

### 2.1 Crear una clave SSH dedicada para el deploy (en tu PC)

```bash
ssh-keygen -t ed25519 -f ./xlugar_deploy_key -N "" -C "github-actions-deploy"
# Genera dos archivos: xlugar_deploy_key (privada) y xlugar_deploy_key.pub (pública)
```

### 2.2 Autorizar la clave pública en el VPS

Copia el contenido de `xlugar_deploy_key.pub` y, **dentro del VPS**:

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "PEGA_AQUI_EL_CONTENIDO_DE_xlugar_deploy_key.pub" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### 2.3 Cargar los secrets en GitHub

En `github.com/sosaneitor/xlugar` → **Settings → Secrets and variables → Actions → New repository secret**. Crea tres:

| Secret        | Valor                                             |
|---------------|---------------------------------------------------|
| `VPS_HOST`    | `2.25.75.17`                                      |
| `VPS_USER`    | `root`                                            |
| `VPS_SSH_KEY` | **todo** el contenido de `xlugar_deploy_key` (la clave PRIVADA, incluidas las líneas `-----BEGIN/END-----`) |

### 2.4 Probar el auto-deploy

```bash
# En tu PC: cualquier cambio pequeño
git commit --allow-empty -m "test: trigger deploy"
git push origin main
```

Ve a la pestaña **Actions** del repo → debe correr "Deploy to VPS" en verde. Recarga
`http://2.25.75.17` para ver el cambio.

> A partir de aquí NO tocas más el VPS a mano: cada push a `main` compila y publica solo.
> El primer deploy ya dejó el `.env`, pm2 y nginx configurados; el workflow solo hace pull+build+restart.

---

## Parte 3 — Dominio + HTTPS (opcional, cuando quieras)

> Requiere mover el DNS en Hostinger hacia el VPS. Hoy `xlugar.com` / `www.xlugar.com`
> apuntan al hosting de Hostinger, no al VPS. Puedes seguir por IP sin hacer esto.

### 3.1 DNS en Hostinger (hPanel → Dominios → Zona DNS)

Elige el hostname a servir y crea/edita:

| Tipo   | Nombre                    | Valor                    |
|--------|---------------------------|--------------------------|
| `A`    | `@` (o subdominio `xxx`)  | `2.25.75.17`             |
| `AAAA` | igual                     | `2a02:4780:75:4834::1`   |
| `A`    | `www` (si aplica)         | `2.25.75.17`             |

Borra los `A`/`AAAA` viejos de ese hostname. Verifica desde tu PC:
`nslookup TU-DOMINIO 8.8.8.8` → debe dar `2.25.75.17`.

### 3.2 En el VPS — dominio en nginx + certificado

```bash
# Reemplaza por tu dominio real (mismos hostnames que en DNS)
sed -i 's/server_name _;/server_name xlugar.com www.xlugar.com;/' /etc/nginx/sites-available/xlugar
nginx -t && systemctl reload nginx

certbot --nginx -d xlugar.com -d www.xlugar.com --redirect --agree-tos -m TU-EMAIL@dominio.com --no-eff-email
```

Certbot instala el cert, activa HTTPS y fuerza 80→443. Renovación automática.

### 3.3 Actualizar la URL pública

Edita `PUBLIC_SITE_URL` en el `.env` del VPS y en tu repo (para que el build lo tome):

```bash
# En el VPS:
sed -i 's#^PUBLIC_SITE_URL=.*#PUBLIC_SITE_URL=https://xlugar.com#' /var/www/xlugar/.env
```
Luego un push a `main` (o `pm2 restart xlugar` tras rebuild) aplica el cambio.
✅ Prueba: **https://xlugar.com** (con candado).

---

## Chuleta

```bash
pm2 status                 # estado de la app
pm2 logs xlugar            # logs en vivo
pm2 restart xlugar         # reiniciar
nginx -t                   # validar nginx
systemctl reload nginx     # recargar nginx
curl -I http://127.0.0.1:4321   # ¿responde la app por dentro?
```

### Problemas comunes
- **502 Bad Gateway** → la app pm2 está caída: `pm2 logs xlugar`.
- **Timeout / no carga** → firewall: `ufw status` (80/443 abiertos).
- **Grid de modelos vacío** → revisa `/api/rooms` en `pm2 logs xlugar`.
- **Action falla en "ssh"** → revisa que `VPS_SSH_KEY` sea la clave privada COMPLETA y que la pública esté en `/root/.ssh/authorized_keys`.
