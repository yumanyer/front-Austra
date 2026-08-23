# AustralFinance frontend

Frontend de producto para AustralFinance, construido exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. La interfaz organiza la experiencia en tres niveles: el mercado perpetuo `YPF-PERP`, el Oracle de precio y la infraestructura de publicación hacia HIP-3 / HyperCore y AssetOracle / HyperEVM.

## Ejecutar localmente

El repositorio no depende de un package manager ni de un framework. Para levantar el preview local del frontend:

```bash
node server.cjs
```

Luego abrir `http://127.0.0.1:4173/`. Las páginas se sirven como HTML estático independiente:

```text
/                         → index.html
/markets/market.html      → Market
/oracle/oracle.html       → Oracle
/infra/infrastructure.html → Infrastructure
```

La navegación utiliza enlaces HTML normales. No existe un router SPA.

## Arquitectura de datos

El flujo de datos implementado es:

```text
HTML estático
    ↓
Page JS
    ↓
Shared State
    ↓
API/Data Layer
    ├── config.js
    ├── endpoints.js
    ├── client.js
    ├── normalize.js
    └── index.js
    ↓
Backend
```

Los controladores de página no hacen `fetch`, no contienen URLs del backend y no interpretan JSON crudo. Reciben recursos normalizados desde `state.js` y actualizan el DOM existente. El componente de chart continúa generando únicamente el SVG del gráfico a partir de una serie ya preparada.

## Configuración

La configuración central está en [`js/api/config.js`](js/api/config.js). El valor por defecto mantiene el modo demo habilitado y utiliza `http://localhost:3000` como base del modo real:

```js
const DEFAULT_CONFIG = {
  API_URL: "http://localhost:3000",
  USE_DEMO_DATA: true,
  REQUEST_TIMEOUT_MS: 5000
};
```

Para habilitar el consumo del backend real, se debe establecer `USE_DEMO_DATA: false` mediante `globalThis.AUSTRAL_CONFIG` antes de cargar los módulos, o ajustar la configuración central para el entorno correspondiente. Las páginas no deben modificarse para cambiar de localhost a una IP de VPS o a un dominio.

## Endpoints consumidos

La data layer centraliza y consume los siguientes endpoints cuando `USE_DEMO_DATA` es `false`:

| Constante | Método | Ruta |
|---|---:|---|
| `HEALTH` | `GET` | `/health` |
| `ORACLE_PRICE` | `GET` | `/oracle/price/YPF` |
| `MARKET` | `GET` | `/market/YPF-PERP` |

El cliente ejecuta las tres solicitudes en paralelo mediante `Promise.all`. Cada respuesta se conserva como un recurso independiente, por lo que un error de Market no elimina un Oracle o Health válido. El backend local confirma que `/health` responde con estado `ok`, timestamp Unix en segundos y subobjetos `oracle`, `breaker`, `hip3` y `pusher`; `/oracle/price/YPF` devuelve el modelo de precio publicado; y `/market/YPF-PERP` devuelve el modelo de mercado con `hip3` anidado. La validación de runtime observó Health `200` y Oracle/Market `503` mientras el backend esperaba datos externos de Data912.

## Módulos de la Data Layer

| Archivo | Responsabilidad |
|---|---|
| [`config.js`](js/api/config.js) | Leer `API_URL`, `USE_DEMO_DATA` y `REQUEST_TIMEOUT_MS` con defaults centralizados |
| [`endpoints.js`](js/api/endpoints.js) | Mantener las tres rutas sin duplicación |
| [`client.js`](js/api/client.js) | Construir URLs, ejecutar `fetch`, headers, cache, timeout, AbortController y errores HTTP/JSON/red |
| [`normalize.js`](js/api/normalize.js) | Convertir respuestas backend a modelos Health, Oracle y Market; normalizar timestamps, CCL, breaker e históricos |
| [`index.js`](js/api/index.js) | Exponer `getHealth`, `getOracle`, `getMarket`, `loadSnapshot` y los normalizadores |
| [`state.js`](js/state.js) | Gestionar `loading`, `lastRefresh`, snapshot, deduplicación de refresh y errores parciales |
| [`utils/time.js`](js/utils/time.js) | Convertir Unix seconds, Unix milliseconds e ISO strings y calcular freshness segura |

## Demo mode y real mode

Con `USE_DEMO_DATA: true`, `loadSnapshot()` no hace requests HTTP. Usa exclusivamente [`js/demo-data.js`](js/demo-data.js) y pasa el fixture por los mismos normalizadores para que las páginas consuman el mismo modelo interno.

Con `USE_DEMO_DATA: false`, el flujo es `API client → normalización → shared state → page controller → DOM`. El cliente no utiliza datos demo como fallback silencioso. Si el backend no está disponible, cada recurso queda en estado `error` con su código clasificado y la UI muestra los estados existentes de unavailable.

## Modelo y campos no disponibles

Los normalizadores no reemplazan campos ausentes por `0`, `false` o valores demo. Los campos opcionales se mantienen como `undefined`, `null` o unavailable según corresponda. Esto aplica especialmente a:

```text
volume24h
openInterest
change24h
history
hyperCoreStatus
hyperEvmStatus
```

El chart no fabrica puntos cuando el modo real no entrega `history`, `series` o `candles`; muestra `Historical data unavailable` mediante el estado existente del componente.

La implementación conserva separados `reportedCcl`, `impliedCcl`, `cclSampled` y `cclDeviation` porque el backend real no entrega un campo plain `ccl`. No se asume que `reportedCcl === ccl` ni que `impliedCcl === ccl`; el slot visual CCL usa `reportedCcl` únicamente como compatibilidad de presentación. La conversión de timestamps se centraliza en `utils/time.js`; el backend confirma que `timestamp`, `lastPrintAt`, `lastFetchOkAt`, `frozenAt`, `lastPublishAt` y `lastPushAt` son segundos Unix o nulos, y los timestamps numéricos menores que `1e12` se convierten a milisegundos antes de crear un `Date`.

Circuit Breaker conserva `frozen`, `frozenPrice`, `frozenAt`, `reason`, `consecutiveOk`, `threshold`, `thresholdPct`, `deviation` y `releaseTicks` cuando existen. Sólo se deriva `FROZEN` cuando `frozen === true`; no se inventan `CLEAR`, `PASS` o release progress sin una señal suficiente.

## Errores

El cliente clasifica internamente estos códigos:

```text
configuration
network
timeout
aborted
http
invalid_json
invalid_payload
```

Los errores técnicos y stack traces no se exponen en pantalla. Las páginas reutilizan `safeErrorMessage`, `emptyNotice` y `statusBadge` para mantener el tratamiento visual existente.

## Blockchain y wallet

Esta fase no integra blockchain ni wallet. Las carpetas [`js/blockchain/`](js/blockchain/) y [`js/wallet/`](js/wallet/) permanecen como placeholders. No se agregaron Web3, ethers, viem, ABI, RPC, llamadas a contratos, MetaMask, WalletConnect, WDK, firmas o transacciones.

## Backend local y validación

El backend local disponible en `backend/` fue inspeccionado como fuente de verdad. Las rutas reales son `GET /health`, `GET /oracle/price/:symbol` y `GET /market/:symbol`; con la configuración predeterminada aceptan `YPF` y `YPF-PERP`. Health respondió `200` con `status: "ok"`, timestamp Unix en segundos, Oracle health, breaker, HIP-3 y pusher. El backend devolvió `503 Oracle not ready yet` para Oracle y Market porque los upstreams de Data912 no pudieron inicializarse en este entorno; esa condición se conserva como error HTTP y no activa fallback demo.

La respuesta real de Oracle contiene `symbol`, `price`, `ema`, `lastPrint`, `bid`, `ask`, `spread`, `spreadPct`, `bookStale`, `pctChange`, `localPriceArs`, `adrRatio`, `impliedCcl`, `reportedCcl`, `cclSampled`, `cclDeviation`, `crossCheck`, `deviation`, `breakerReason`, `frozenAt`, `timestamp`, `lastPrintAt`, `status`, `source`, `simulated` y `marketOpen`. La respuesta real de Market contiene `symbol`, `markPrice`, `indexPrice`, `fundingRate`, `maxLeverage`, `marketStatus`, `hip3`, `oracleStatus`, `oracleSource`, `simulated`, `lastPushTx` y `lastPushAt`; no garantiza volume, open interest, history, HyperCore o HyperEVM. No se modificó ningún archivo de backend o contracts.

## Tests y validación

El smoke test no requiere red y cubre normalización completa e incompleta de Oracle y Market, Health, timestamps, freshness, Circuit Breaker, CCL, campos ausentes, errores de configuración/red/timeout/abort/HTTP/JSON/payload, demo mode y real mode.

Ejecutar:

```bash
node tests/smoke.mjs
```

Validar sintaxis:

```bash
node --check js/api/config.js
node --check js/api/endpoints.js
node --check js/api/client.js
node --check js/api/normalize.js
node --check js/api/index.js
node --check js/utils/time.js
node --check js/components/chart.js
node --check js/state.js
node --check markets/market.js
node --check oracle/oracle.js
node --check infra/infrastructure.js
```

La validación real ejecutada incluyó backend levantado, Health `200`, respuestas HTTP `503` de Oracle y Market por upstream Data912 no disponible, modo real probado con un snapshot parcial, y confirmación de que el error HTTP no utiliza el fixture. Queda pendiente una prueba de datos de precio reales cuando Data912 responda correctamente.
