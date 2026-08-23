# AustralFinance Frontend

## 1. Descripción general

El frontend de AustralFinance es una interfaz de producto construida exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. No utiliza frameworks, router SPA ni dependencias de frontend.

La experiencia se organiza en tres superficies principales:

| Interfaz | Responsabilidad |
| --- | --- |
| **Market** | Visualización del mercado perpetuo `YPF-PERP`. |
| **Oracle** | Precio de referencia, EMA, CCL, Circuit Breaker y estado del feed. |
| **Infrastructure** | Estado de publicación hacia HIP-3 / HyperCore y AssetOracle / HyperEVM. |

La separación entre interfaz, backend, blockchain y wallet permite completar cada integración de forma independiente sin acoplar la lógica de una capa con otra.

---

## 2. Ejecución local

El frontend es estático y no requiere instalación de dependencias. Desde el directorio `frontend/`, ejecutar:

```bash
node server.cjs
```

Después, abrir [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

| Ruta | Interfaz |
| --- | --- |
| `/` | `index.html` / Market |
| `/markets/market.html` | Market |
| `/oracle/oracle.html` | Oracle |
| `/infra/infrastructure.html` | Infrastructure |

La navegación utiliza enlaces HTML normales; no existe un router SPA.

---

## 3. Arquitectura del proyecto

La estructura principal del frontend es la siguiente:

```
frontend/
├── css/
│   ├── media.css
│   └── root.css
│
├── infra/
│   ├── infra.css
│   ├── infrastructure.html
│   └── infrastructure.js
│
├── js/
│   ├── api/
│   │   ├── client.js
│   │   ├── config.js
│   │   ├── endpoints.js
│   │   ├── index.js
│   │   └── normalize.js
│   │
│   ├── blockchain/
│   │   └── README.md
│   │
│   ├── components/
│   │   ├── chart.js
│   │   └── common.js
│   │
│   ├── app.js
│   ├── demo-data.js
│   ├── state.js
│   │
│   ├── utils/
│   │   └── format.js
│   │
│   └── wallet/
│       └── README.md
│
├── markets/
│   ├── market.html
│   ├── market.js
│   └── markets.css
│
├── oracle/
│   ├── oracle.css
│   ├── oracle.html
│   └── oracle.js
│
├── tests/
│   └── smoke.mjs
│
├── docs/
│   └── fase-2-data-layer.md
│
├── index.html
├── logo.png
├── server.cjs
└── README.md
```

---

## 4. Arquitectura de datos

El flujo general de datos es:

```
HTML
  ↓
Page Controller
  ↓
Shared State
  ↓
API / Data Layer
  ├── config.js
  ├── endpoints.js
  ├── client.js
  ├── normalize.js
  └── index.js
  ↓
HTTP
  ↓
Backend
  ├── /health
  ├── /oracle/price/YPF
  └── /market/YPF-PERP
```

Los controladores de página no ejecutan `fetch()` directamente, no contienen URLs del backend y no interpretan respuestas JSON crudas.

El recorrido completo de una respuesta es:

```
Backend response
      ↓
API client
      ↓
Normalizer
      ↓
Shared State
      ↓
Page Controller
      ↓
DOM
```

Este diseño permite cambiar la implementación del backend sin acoplarla directamente a cada página. Del mismo modo, el componente de chart recibe una serie ya preparada y se limita a generar el SVG correspondiente.

---

## 5. Configuración central

La configuración principal se encuentra en `js/api/config.js`:

```
const DEFAULT_CONFIG = {
  API_URL: "http://localhost:3000",
  USE_DEMO_DATA: false,
  REQUEST_TIMEOUT_MS: 5000,
};
```

| Variable | Valor por defecto | Propósito |
| --- | --- | --- |
| `API_URL` | `http://localhost:3000` | URL base del backend. |
| `USE_DEMO_DATA` | `false` | Selecciona backend real o fixtures explícitos. |
| `REQUEST_TIMEOUT_MS` | `5000` | Tiempo máximo de espera de una solicitud. |

### Modo real

El modo real está habilitado actualmente mediante:

```
USE_DEMO_DATA: false
```

En este modo, el frontend realiza solicitudes al backend:

```
Frontend
   ↓
API Client
   ↓
Backend :3000
   ↓
Oracle / Market / Health
```

### Modo demo

El modo demo se activa explícitamente antes de cargar los módulos correspondientes:

```
globalThis.AUSTRAL_CONFIG = {
  USE_DEMO_DATA: true,
};
```

Los fixtures se encuentran en `js/demo-data.js` y atraviesan los mismos normalizadores que las respuestas reales. El modo demo no se utiliza como fallback automático cuando el backend falla.

---

## 6. Backend local y CORS

El backend se encuentra en `../backend/` respecto del frontend. La arquitectura local es:

```
front-local/
├── backend/
├── contracts/
└── frontend/
```

Para iniciar el backend:

```bash
cd backend
npm run dev
```

Por defecto, el backend escucha en:

```
http://localhost:3000
```

El frontend se inicia desde otra terminal:

```bash
cd frontend
node server.cjs
```

Y queda disponible en:

```
http://127.0.0.1:4173
```

### Configuración de CORS

Durante el desarrollo local, frontend y backend utilizan orígenes diferentes. El backend debe permitir explícitamente el origen del frontend:

```
Frontend: http://127.0.0.1:4173
Backend:  http://localhost:3000
```

Una configuración recomendada para desarrollo local es:

```
CORS_ORIGINS=http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173
```

La configuración de CORS debe mantenerse en el backend. El frontend no debe implementar workarounds para evitar las políticas del navegador.

---

## 7. Endpoints consumidos

Cuando `USE_DEMO_DATA` es `false`, la Data Layer consume los siguientes endpoints:

| Constante | Método | Ruta | Uso |
| --- | --- | --- | --- |
| `HEALTH` | `GET` | `/health` | Estado global, Oracle, Circuit Breaker, HIP-3 y pusher. |
| `ORACLE_PRICE` | `GET` | `/oracle/price/YPF` | Precio, EMA, CCL, cross-check, timestamps y estado del Oracle. |
| `MARKET` | `GET` | `/market/YPF-PERP` | Mark price, index price, funding, leverage, estado de mercado y HIP-3. |

Las tres solicitudes se ejecutan en paralelo. Un error individual no invalida automáticamente los demás recursos.

Por ejemplo:

```
Health  → válido
Oracle  → error
Market  → válido
```

En ese caso, el estado compartido conserva los recursos válidos y registra el error únicamente en el recurso afectado.

---

## 8. Estado actual de la integración

La integración frontend → backend fue probada mediante solicitudes HTTP reales. Actualmente, los siguientes endpoints responden correctamente desde el backend local:

```
GET /health
GET /oracle/price/YPF
GET /market/YPF-PERP
```

El flujo verificado es:

```
Frontend :4173
      ↓
HTTP
      ↓
Backend :3000
      ↓
200 OK
```

Oracle también inicializa correctamente y puede proporcionar un precio EMA. Un ejemplo de log es:

```
[oracle] EMA seeded from the last close → $50.060001
```

El backend puede utilizar `ema_fallback` cuando corresponde, según el estado del upstream.

---

## 9. Componentes de la Data Layer

| Módulo | Responsabilidad |
| --- | --- |
| `config.js` | Centraliza `API_URL`, `USE_DEMO_DATA` y `REQUEST_TIMEOUT_MS`. |
| `endpoints.js` | Mantiene en un único lugar las rutas de Health, Oracle y Market. |
| `client.js` | Construye URLs, ejecuta `fetch`, configura headers y cache, aplica timeout, utiliza `AbortController`, valida HTTP, parsea JSON y clasifica errores. |
| `normalize.js` | Convierte respuestas del backend en modelos internos consumibles por la UI. |
| `index.js` | Expone la API pública de la Data Layer y centraliza la carga del snapshot y los normalizadores. |
| `state.js` | Mantiene `loading`, `lastRefresh`, `snapshot` y `errors`, además de coordinar refresh y errores parciales. |
| `utils/time.js` | Centraliza conversión de timestamps y cálculo de freshness. |

La API pública de la Data Layer contempla:

```
getHealth( )
getOracle()
getMarket()
loadSnapshot()
```

---

## 10. Timestamps y freshness

`utils/time.js` centraliza la conversión de:

| Formato | Soporte |
| --- | --- |
| Unix seconds | Sí |
| Unix milliseconds | Sí |
| ISO strings | Sí |
| `null` / `undefined` | Sí |

Los timestamps Unix expresados en segundos se convierten a milisegundos antes de crear objetos `Date`.

La freshness se calcula a partir del timestamp disponible del recurso. El estado operacional de `health.oracle.lastFetchOkAt` se mantiene separado para distinguir la frescura del precio de la salud del upstream.

---

## 11. Modelo de Market

El backend real proporciona campos como:

```
symbol
markPrice
indexPrice
fundingRate
maxLeverage
marketStatus
hip3
oracleStatus
oracleSource
simulated
lastPushTx
lastPushAt
```

El backend no garantiza actualmente los siguientes campos:

```
volume24h
openInterest
change24h
history
hyperCoreStatus
hyperEvmStatus
```

Por esta razón, el frontend no inventa valores. Cuando un dato no está disponible, conserva el estado correspondiente como `undefined`, `null` o `unavailable`, según el modelo interno.

No se utilizan valores falsos como `0`, `0%` o `false` para representar información desconocida.

### Datos históricos

El chart utiliza exclusivamente datos históricos entregados por el backend. Si el modo real no proporciona `history`, `series` o `candles`, no se fabrican puntos artificiales.

En ese caso, el componente muestra:

```
Historical data unavailable
```

Esto evita presentar datos demo como si fueran datos reales del mercado.

---

## 12. Modelo de Oracle

La respuesta real puede contener los siguientes campos:

```
symbol
price
ema
lastPrint
bid
ask
spread
spreadPct
pctChange
localPriceArs
adrRatio
impliedCcl
reportedCcl
cclSampled
cclDeviation
crossCheck
deviation
breakerReason
frozenAt
timestamp
lastPrintAt
status
source
simulated
marketOpen
```

Todos los campos se normalizan antes de llegar a la UI.

### CCL

El backend no entrega necesariamente un único campo genérico `ccl`. Por eso se mantienen separados:

```
reportedCcl
impliedCcl
cclSampled
cclDeviation
```

El frontend no asume que:

```
reportedCcl === impliedCcl
```

Tampoco crea un valor `ccl` artificial. El slot visual existente utiliza `reportedCcl` cuando está disponible.

### Circuit Breaker

El modelo conserva, cuando existen, los siguientes campos:

```
frozen
frozenPrice
frozenAt
reason
consecutiveOk
threshold
thresholdPct
deviation
releaseTicks
```

El estado `FROZEN` sólo se deriva cuando:

```
frozen === true
```

No se inventan estados como `CLEAR`, `PASS` o `RELEASE` sin una señal suficiente proveniente del backend.

---

## 13. Modelo de Health

El backend devuelve un recurso con la siguiente estructura conceptual:

```
Health
├── status
├── timestamp
├── oracle
├── breaker
├── hip3
└── pusher
```

El frontend normaliza todas estas ramas antes de utilizarlas.

---

## 14. Manejo de errores

El cliente clasifica internamente los errores en las siguientes categorías:

```
configuration
network
timeout
aborted
http
invalid_json
invalid_payload
```

Los errores técnicos y los stack traces no se muestran al usuario. La UI utiliza los mecanismos existentes para representar estados de error o unavailable:

```
safeErrorMessage
emptyNotice
statusBadge
```

Cuando un recurso falla, conserva su error sin ocultar los datos válidos de los demás recursos.

---

## 15. Demo mode y real mode

### Demo mode

```
USE_DEMO_DATA = true
```

Flujo:

```
demo-data.js
     ↓
DEMO_SNAPSHOT
     ↓
normalizers
     ↓
state
     ↓
UI
```

En este modo no se realizan solicitudes HTTP.

### Real mode

```
USE_DEMO_DATA = false
```

Flujo:

```
API
 ↓
HTTP client
 ↓
Backend
 ↓
normalizers
 ↓
state
 ↓
UI
```

No existe fallback silencioso a demo. Si el backend devuelve un error, el flujo es:

```
HTTP error
   ↓
resource.error
   ↓
UI unavailable state
```

Los datos demo nunca reemplazan automáticamente a los datos reales.

---

## 16. Blockchain, wallet y contratos

La Fase 2 no integra blockchain ni wallet. Las siguientes carpetas permanecen como placeholders o documentación:

```
js/blockchain/
js/wallet/
```

No se agregaron:

```
Web3
ethers
viem
ABI
RPC
MetaMask
WalletConnect
WDK
firmas
transacciones
```

La integración blockchain se mantiene separada de la Data Layer HTTP.

Los contratos se encuentran fuera del frontend, en `../contracts/`. El frontend no modifica ni depende directamente del código Solidity en esta fase.

La integración futura deberá utilizar una capa específica para blockchain, sin introducir llamadas de contratos dentro de los controladores de página.

---

## 17. Tests y validación de sintaxis

El frontend dispone de un smoke test sin dependencia de red:

```bash
node tests/smoke.mjs
```

El test cubre:

- Normalización completa e incompleta de Oracle.

- Normalización de Market y Health.

- Timestamps y freshness.

- Circuit Breaker y CCL.

- Campos ausentes.

- Errores de configuración, red, timeout, abort, HTTP, JSON inválido y payload inválido.

- Demo mode y real mode.

La sintaxis de los módulos principales se puede validar con:

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

---

## 18. Estado de la Fase 2

### Completado

| Área | Estado |
| --- | --- |
| Frontend HTML/CSS/JS Vanilla | Completado |
| Data Layer centralizada | Completado |
| API client | Completado |
| Endpoints centralizados | Completado |
| Normalizadores | Completado |
| Shared state | Completado |
| Manejo de errores | Completado |
| Demo mode separado del modo real | Completado |
| Integración HTTP con backend | Completado |
| CORS de desarrollo local | Completado |
| Health, Oracle y Market | Conectados |
| Timestamps y freshness | Completado |
| Circuit Breaker | Completado |
| CCL separado | Completado |
| Campos opcionales | Completado |
| Smoke tests | Completado |
| Validación de sintaxis | Completado |

### Pendiente

| Área | Estado |
| --- | --- |
| Completar visualmente los campos disponibles que aún no están conectados a la UI | Pendiente |
| Determinar qué campos requieren implementación adicional en backend | Pendiente |
| Integrar datos históricos cuando el backend los exponga | Pendiente |
| Integrar métricas de Market que no forman parte del contrato actual | Pendiente |
| Integración blockchain | Fuera de Fase 2 |
| Integración wallet | Fuera de Fase 2 |
| Integración HIP-3 / HyperCore desde frontend | Futura |
| Configuración de producción para `API_URL` | Pendiente |
| Validación contra backend desplegado en VPS | Pendiente |

Los campos que no existen en el contrato backend no deben rellenarse con datos ficticios. Deben permanecer como `unavailable` o incorporarse mediante una ampliación explícita del contrato.

---

## 19. Principios de implementación

La integración sigue estos principios:

1. HTML semántico antes que abstracciones innecesarias.

1. CSS separado de la lógica.

1. JavaScript Vanilla sin frameworks.

1. Los controladores de página no realizan solicitudes HTTP.

1. Las URLs del backend viven únicamente en la Data Layer.

1. Las respuestas del backend se normalizan antes de llegar a la UI.

1. Los datos demo nunca reemplazan silenciosamente a los datos reales.

1. Los campos inexistentes no se inventan.

1. Blockchain y wallet permanecen desacoplados del flujo HTTP.

1. El contrato real del backend es la fuente de verdad para los datos disponibles.

1. Los cambios de entorno no requieren modificar cada página.

1. La interfaz existente se conserva mientras se completa la integración.

---

## 20. Estructura del repositorio completo

```
front-local/
├── backend/
│   ├── src/
│   └── test/
│
├── contracts/
│   ├── src/
│   ├── script/
│   └── test/
│
└── frontend/
    ├── css/
    ├── docs/
    ├── infra/
    ├── js/
    ├── markets/
    ├── oracle/
    ├── tests/
    ├── index.html
    └── server.cjs
```

La organización mantiene separados backend, contratos y frontend, y permite que las futuras integraciones blockchain y wallet se incorporen mediante capas específicas sin contaminar la Data Layer HTTP.

---

## Referencia documental

Este documento fue redactado a partir de la especificación técnica proporcionada en `pasted_content_4.txt`.