# Deployment VPS de AustralFinance

Este directorio contiene la configuración versionada para preparar una VPS Ubuntu 24.04 con Nginx, Node.js y PM2. La configuración no ejecuta cambios en OCI, firewall o una máquina remota: debe aplicarse manualmente después de validar el acceso SSH y los datos reales de la instancia.

> **Estado de esta entrega:** los archivos Nginx, PM2 y `.env.example` están preparados y auditados contra el código del repositorio. La VPS, su IP, VCN, subnet, reglas de seguridad, dominio, HTTPS y backups no fueron verificados desde este entorno y permanecen `PENDING` hasta ejecutar el checklist remoto.

## Resultado de la auditoría local

| Campo | Valor comprobado |
|---|---|
| Backend entrypoint | `backend/src/index.js` |
| Backend start command | `npm start` desde `backend/` |
| Backend default port | `3000`, configurable mediante `PORT` |
| Backend bind host | `127.0.0.1` por defecto, configurable mediante `HOST` |
| Direct health endpoint | `GET http://127.0.0.1:3000/health` |
| Public health endpoint | `GET /api/health` vía Nginx |
| API prefix in backend | Ninguno; las rutas reales son `/health`, `/oracle/price/:symbol` y `/market/:symbol` |
| API prefix public | `/api`, eliminado por `proxy_pass ...:3000/` |
| Frontend root | `/opt/austral/frontend` |
| Frontend main page | `/opt/austral/frontend/index.html` |
| PM2 process name | `austral-backend` |
| PM2 production mechanism | `npm start`, definido en `backend/package.json` |

El backend registra las rutas sin prefijo `/api`. Por eso `deploy/nginx/austral.conf` usa `location /api/` junto con `proxy_pass http://127.0.0.1:3000/`; por ejemplo, `/api/market/YPF-PERP` llega al backend como `/market/YPF-PERP`. El frontend usa `API_URL: "/api"` desde `frontend/js/env.js` y `frontend/js/api/config.js` no contiene un host de producción.

## Estructura objetivo

```text
/opt/austral/
├── ecosystem.config.cjs
├── logs/
├── frontend/
│   ├── index.html
│   ├── js/
│   ├── css/
│   ├── markets/
│   ├── oracle/
│   └── infra/
└── backend/
    ├── src/
    ├── package.json
    ├── package-lock.json
    └── .env
```

La carpeta `deploy/` del repositorio sirve como fuente de configuración. No debe copiarse ningún `.env`, clave privada, log, `node_modules` o artefacto temporal desde el entorno de desarrollo.

## Preparación de Ubuntu 24.04

Ejecutar como usuario administrativo con `sudo`, no como root de forma permanente. Los comandos siguientes son un procedimiento de referencia; primero confirmar la distribución, versión de Node.js, nombre de usuario de despliegue y rutas disponibles.

```bash
sudo apt update
sudo apt install -y nginx
node --version
npm --version
pm2 --version
```

La versión de Node.js debe ser compatible con el `package.json` y con `--env-file-if-exists`, utilizado por el script `npm start`. Instalar PM2 con el mecanismo aprobado para la instancia si todavía no existe y verificarlo con `pm2 --version`.

## Copia del proyecto

Desde una copia del repositorio en la VPS, crear las rutas objetivo y copiar sólo frontend, backend y la configuración PM2. El contrato blockchain no es necesario para arrancar el frontend/backend en producción y puede mantenerse fuera de la ruta de servicios.

```bash
sudo mkdir -p /opt/austral/frontend /opt/austral/backend /opt/austral/logs
sudo cp -a frontend/. /opt/austral/frontend/
sudo cp -a backend/. /opt/austral/backend/
sudo cp deploy/pm2/ecosystem.config.cjs /opt/austral/ecosystem.config.cjs
sudo chown -R "$USER":"$USER" /opt/austral
```

Instalar las dependencias de producción y crear el entorno privado del backend:

```bash
cd /opt/austral/backend
npm ci --omit=dev
cp .env.example .env
chmod 600 .env
${EDITOR:-nano} .env
```

`backend/.env.example` contiene todas las variables leídas por el backend sin secretos reales. Completar `PUSHER_PRIVATE_KEY`, `HIP3_ORACLE_UPDATER_KEY` y `ORACLE_CONTRACT_ADDRESS` sólo si se pretende habilitar esas integraciones. Mantener `HIP3_ENABLED=false` y `HIP3_DRY_RUN=true` hasta verificar credenciales, stake y venue. Nunca copiar claves al frontend.

## PM2

El entrypoint real es `backend/src/index.js` y el script de producción existente es `npm start`. El archivo `deploy/pm2/ecosystem.config.cjs` usa ese script, fija el working directory en `/opt/austral/backend`, carga `/opt/austral/backend/.env`, reinicia el proceso ante fallos y escribe logs en `/opt/austral/logs/`.

```bash
cd /opt/austral
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs austral-backend --lines 50
curl -fsS http://127.0.0.1:3000/health
pm2 save
pm2 startup
```

`pm2 startup` imprime un comando específico para el usuario y la instancia. Ejecutarlo con `sudo` sólo después de copiar el comando exacto que PM2 devuelve; no sustituirlo por una orden inventada. Luego repetir `pm2 save` con el proceso correcto.

## Nginx

Instalar la configuración incluida y eliminar la página default sólo después de validar el archivo. El bloque sirve archivos físicos, no usa fallback SPA y mantiene el backend privado en loopback.

```bash
sudo install -m 0644 /RUTA/AL/REPOSITORIO/deploy/nginx/austral.conf /etc/nginx/sites-available/austral
sudo ln -sfn /etc/nginx/sites-available/austral /etc/nginx/sites-enabled/austral
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Reemplazar `/RUTA/AL/REPOSITORIO` por la ruta real del checkout que contiene `deploy/nginx/austral.conf`; la ruta de servicios continúa siendo `/opt/austral/frontend` y `/opt/austral/backend`. La raíz pública queda así:

| URL | Destino |
|---|---|
| `/` | `/opt/austral/frontend/index.html` |
| `/markets/market.html` | `/opt/austral/frontend/markets/market.html` |
| `/oracle/oracle.html` | `/opt/austral/frontend/oracle/oracle.html` |
| `/infra/infrastructure.html` | `/opt/austral/frontend/infra/infrastructure.html` |
| `/api/health` | Backend interno `/health` |
| `/api/oracle/price/YPF` | Backend interno `/oracle/price/YPF` |
| `/api/market/YPF-PERP` | Backend interno `/market/YPF-PERP` |

El frontend mantiene `YPF-USDC` como alias visual del mercado, mientras `/api/market/YPF-PERP` es la ruta técnica backend actual. No cambiar el proxy a `/api` en el backend ni eliminar el slash final de `proxy_pass` sin migrar primero las rutas reales.

## CORS y exposición de puertos

La navegación de producción utiliza el mismo origen: el navegador solicita `/api/...` al host de Nginx y Nginx hace el proxy interno. En ese flujo no se necesita abrir el puerto `3000` públicamente ni depender de CORS para el frontend. El backend queda configurado para escuchar en `127.0.0.1` por defecto.

Si se requiere un cliente externo legítimo, definir una allow-list explícita en `CORS_ORIGINS`; no usar `origin: "*"` como solución. Validar las reglas de OCI/iptables existentes antes de tocar el firewall y no ejecutar un flush global. El objetivo público mínimo es `22/tcp` para SSH, `80/tcp` para HTTP y `443/tcp` para HTTPS cuando éste sea configurado.

## Validación post-deployment

```bash
# Backend sólo en loopback
ss -ltnp | grep -E ':3000|:80|:443'
curl -fsS http://127.0.0.1:3000/health

# Sitio y proxy desde la IP o dominio configurado
curl -I http://SERVER_HOST/
curl -fsS http://SERVER_HOST/api/health
curl -I http://SERVER_HOST/markets/market.html
curl -I http://SERVER_HOST/oracle/oracle.html
curl -I http://SERVER_HOST/infra/infrastructure.html

# Procesos y logs
pm2 status
pm2 logs austral-backend --lines 50 --nostream
sudo nginx -t
sudo systemctl status nginx --no-pager
```

Comprobar manualmente que `/` carga `index.html`, que no aparece la página default de Nginx, que los imports y assets relativos funcionan y que la pestaña Network del navegador muestra `/api/health`, `/api/oracle/price/YPF` y `/api/market/YPF-PERP`, nunca `http://localhost:3000` ni una IP pública con puerto `3000`.

## Infraestructura OCI, dominio y backups

La región, VCN, subnet, Internet Gateway, Route Table, IP pública, reglas Security List/NSG, acceso SSH y presencia de Docker deben verificarse en la cuenta OCI y no pueden inferirse desde este repositorio. La IP `137.131.210.2` aparece en la especificación de deployment como referencia, pero no fue validada desde el sandbox; reemplazar `SERVER_HOST` por el valor real.

El dominio y HTTPS quedan `PENDING` hasta contar con DNS apuntando a la IP real y un certificado configurado, por ejemplo mediante Certbot. Los backups quedan `PENDING` hasta definir destino, frecuencia, retención y prueba de restauración. Como mínimo, conservar copias de `/opt/austral/backend/.env` fuera de Git con permisos restringidos y respaldar el código/configuración antes de cada actualización.

## Seguridad

No subir `.env`, `.env.*`, claves, certificados privados, `node_modules`, logs ni temporales. El `.gitignore` raíz protege esos patrones y permite únicamente los archivos `.env.example`. No exponer el backend directamente, no ejecutar la aplicación como root, no modificar contratos ni borrar reglas de OCI sin una ventana de mantenimiento documentada.

## Checklist de estado

| Área | Estado |
|---|---|
| Frontend estático y rutas físicas | `READY` en código local |
| `API_URL=/api` y bootstrap `env.js` | `READY` en código local |
| Backend entrypoint/port/health auditados | `READY` en código local |
| Backend loopback por defecto | `READY` en código local |
| Configuración Nginx | `READY` como plantilla versionada |
| Configuración PM2 | `READY` como plantilla versionada |
| `.env.example` sin secretos | `READY` |
| Instalación real en VPS | `PENDING` |
| IP pública y OCI Security List | `PENDING / NOT VERIFIED` |
| Dominio y HTTPS | `PENDING` |
| Firewall aplicado y validado | `PENDING` |
| Backups y restauración probados | `PENDING` |

El deployment se considera operativo sólo después de ejecutar la validación post-deployment en la VPS real. La existencia de estos archivos no equivale a que Nginx, PM2 o el firewall ya hayan sido configurados remotamente.
