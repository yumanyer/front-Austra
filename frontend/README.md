# AustralFinance frontend

Frontend de producto para AustralFinance, construido exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. La aplicación organiza la experiencia en tres vistas: el mercado perpetuo `YPF-PERP`, el Oracle de precio y la infraestructura de publicación hacia HIP-3 / HyperCore y AssetOracle / HyperEVM.

La versión actual está configurada como **DEMO DATA** para revisión visual. Los precios, estados, métricas y puntos del chart provienen de `js/demo-data.js` y se muestran como `SIMULATED` o `DEMO DATA` dentro de la interfaz. No se ejecutan llamadas a backend, blockchain ni wallet en este modo.

## Ejecutar localmente

El proyecto no usa un framework ni un bundler. Para levantar el preview local con Node.js:

```bash
node server.cjs
```

Luego abrir `http://127.0.0.1:4173/`. Las rutas SPA disponibles son `/`, `/markets`, `/oracle` e `/infrastructure`. El servidor sirve `index.html` para las rutas sin extensión y los assets estáticos desde sus paths reales.

## Arquitectura actual

La SPA tiene una única fuente de verdad para navegación, datos y renderizado. El servidor de preview sólo entrega archivos y resuelve el fallback de rutas; no contiene lógica de producto.

| Área | Ubicación | Responsabilidad |
| --- | --- | --- |
| Entrada | `index.html` | Shell HTML, configuración runtime y carga de `js/app.js`. |
| Orquestación | `js/app.js` | Routing SPA, layout global, navegación y eventos de shell. |
| Estado | `js/state.js` | Snapshot, estado de carga, ruta actual y suscripciones. |
| Datos | `js/api.js` | Requests HTTP, timeouts y normalización de contratos externos. |
| Fixture | `js/demo-data.js` | Snapshot explícito para revisión visual sin requests. |
| Componentes | `js/components/` | Primitivas compartidas de UI y gráfico. |
| Vistas | `js/views/` | Renderizadores de Market, Oracle e Infrastructure. |
| Wallet | `js/wallet/` | Punto reservado para el adaptador de wallet; no se conecta en esta versión. |
| Estilos | `css/styles.css` | Sistema visual y responsive de la SPA. |
| Preview | `server.cjs` | Servidor estático local con fallback SPA y protección de paths. |

Los antiguos árboles de páginas independientes y utilidades duplicadas fueron retirados porque no tenían consumidores activos y mantenían contratos incompatibles con la SPA. Las dependencias instaladas tampoco se versionan: `frontend/node_modules/` se reconstruye a partir de `package-lock.json` y está excluido por `.gitignore`.

## Configurar el backend cuando exista

La URL base se configura antes de cargar `js/app.js` mediante `window.AUSTRAL_CONFIG` en `index.html`:

```html
<script>
  window.AUSTRAL_CONFIG = {
    API_URL: "https://api.example.com",
    USE_DEMO_DATA: false
  };
</script>
```

Con `USE_DEMO_DATA: true`, el cliente no realiza requests y usa el fixture explícito. Con la bandera en `false`, `js/state.js` delega en `loadSnapshot()` de `js/api.js`, que consulta y normaliza:

```text
GET /health
GET /oracle/price/YPF
GET /market/YPF-PERP
```

Los componentes no hacen `fetch()` directamente. Si un endpoint falla, el snapshot conserva el estado de error y la UI muestra `Oracle unavailable`, `Market data unavailable` o `Backend unavailable` sin inventar métricas.

## Puntos de integración futuros

La interfaz ya separa la fuente de datos de la presentación. El backend se integrará detrás de `js/api.js`; la información de blockchain podrá agregarse como un recurso normalizado dentro del snapshot sin modificar las vistas; y el wallet deberá entrar únicamente a través de `js/wallet/`, actualizando estado mediante eventos antes de habilitar acciones de usuario. En esta etapa esos puntos se mantienen inertes: no hay conexión, firma, envío de transacciones, ABI ni contrato implementado.

## Verificación

La prueba de normalización se ejecuta con:

```bash
npm test
```

Los módulos JavaScript propios se pueden validar con:

```bash
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check server.cjs
```

El flujo de verificación del preview debe cubrir las cuatro rutas SPA y confirmar que los assets existentes responden con `200`, mientras que los assets inexistentes responden con `404`.

## Estructura

```text
index.html
css/styles.css
js/app.js
js/api.js
js/state.js
js/demo-data.js
js/utils.js
js/components/common.js
js/components/chart.js
js/views/market.js
js/views/oracle.js
js/views/infrastructure.js
js/wallet/connector.js
js/wallet/events.js
logo.png
server.cjs
package.json
package-lock.json
tests/smoke.mjs
```
