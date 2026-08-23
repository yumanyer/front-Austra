# AustralFinance Frontend

## 1. Descripción general

El frontend de AustralFinance es una interfaz de producto construida exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. No utiliza frameworks, router SPA ni dependencias de frontend.

La experiencia se organiza en tres superficies principales:

| Interfaz | Responsabilidad |
| --- | --- |
| **Market** | Visualización del mercado `YPF-USDC`, sus referencias de precio, métricas operativas y chart de presentación. |
| **Oracle** | Precio de referencia, EMA, CCL, Circuit Breaker y estado del feed. |
| **Infrastructure** | Arquitectura conceptual, metadata de deployment y estado on-chain read-only de HIP-3 / HyperCore / YPFOracle / HyperEVM. |

La separación entre interfaz, backend, blockchain y wallet permite completar cada integración de forma independiente. Infrastructure consulta RPC sólo en modo lectura y mantiene la escritura blockchain y wallet fuera de alcance. La Data Layer HTTP consume y normaliza los datos reales; una capa visual independiente aporta únicamente los valores de presentación que todavía no existen en el contrato Market.

> **Nomenclatura:** `YPF-USDC` es el símbolo visible de la interfaz. El endpoint backend actualmente implementado conserva la ruta técnica `GET /market/YPF-PERP`; no se renombró el contrato HTTP porque el backend real sigue validando ese path y devuelve la identidad operativa configurada.

> **Regla de datos:** Price, EMA, Data source, Funding Rate, Mark Price, Index Price, CCL, Breaker, Threshold, Current deviation, Release ticks, Oracle status y Market status conservan su origen backend o fixture principal. Open Interest, 24h Volume y la serie histórica del chart son datos de presentación aislados y no sobrescriben ningún campo real.

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

Para probar el modo real con el backend local, iniciar el backend en otra terminal:

```bash
cd backend
npm run dev
```

El backend queda disponible normalmente en `http://localhost:3000` y el frontend en `http://127.0.0.1:4173`.

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
│   ├── presentation-data.js
│   ├── state.js
│   │
│   ├── utils/
│   │   ├── format.js
│   │   └── time.js
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

Los controladores de página no ejecutan `fetch( )` directamente, no contienen URLs del backend y no interpretan respuestas JSON crudas. Cada respuesta recorre el cliente HTTP, los normalizadores y el estado compartido antes de llegar al DOM.

El chart recibe una serie preparada por el controlador. Cuando el backend todavía no entrega histórico, el controlador obtiene una serie de presentación desde `presentation-data.js` y la alinea con el Price y la EMA reales en el último punto.

```
Backend o demo fixture
        ↓
API client
        ↓
Normalizer
        ↓
Shared State
        ↓
Page Controller
        ├── datos reales normalizados
        └── datos visuales de presentación
        ↓
DOM
```

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
| `USE_DEMO_DATA` | `false` | Selecciona backend real o fixture principal. |
| `REQUEST_TIMEOUT_MS` | `5000` | Tiempo máximo de espera de una solicitud. |

### Modo real

Con `USE_DEMO_DATA: false`, la Data Layer solicita Health, Oracle y Market al backend configurado. Los datos reales llegan desde las respuestas normalizadas y los errores se conservan por recurso.

### Modo demo

El modo demo se activa explícitamente antes de cargar los módulos correspondientes:

```
globalThis.AUSTRAL_CONFIG = {
  USE_DEMO_DATA: true,
};
```

Los datos principales del fixture se encuentran en `js/demo-data.js` y atraviesan los mismos normalizadores que las respuestas reales. La capa visual de `js/presentation-data.js` se aplica en ambos modos para garantizar que Volume, Open Interest y el chart tengan una presentación consistente.

El modo demo no se utiliza como fallback automático cuando el backend falla.

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

Durante el desarrollo local, frontend y backend utilizan orígenes diferentes. El backend debe permitir explícitamente el origen del frontend mediante CORS:

```
Frontend: http://127.0.0.1:4173
Backend:  http://localhost:3000
```

Una configuración de desarrollo local puede incluir:

```
CORS_ORIGINS=http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173
```

La configuración de CORS debe mantenerse en el backend. El frontend no implementa workarounds para evitar las políticas del navegador.

---

## 7. Endpoints consumidos

Cuando `USE_DEMO_DATA` es `false`, la Data Layer consume los siguientes endpoints:

| Constante | Método | Ruta | Uso |
| --- | --- | --- | --- |
| `HEALTH` | `GET` | `/health` | Estado global, Oracle, Circuit Breaker, HIP-3 y pusher. |
| `ORACLE_PRICE` | `GET` | `/oracle/price/YPF` | Precio, EMA, CCL, cross-check, timestamps y estado del Oracle. |
| `MARKET` | `GET` | `/market/YPF-PERP` | Ruta técnica del instrumento; la interfaz lo muestra como `YPF-USDC` junto con Mark Price, Index Price, funding, leverage, estado de mercado y HIP-3. |

Las tres solicitudes se ejecutan en paralelo. Un error individual no invalida automáticamente los demás recursos.

Por ejemplo:

```
Health  → válido
Oracle  → error
Market  → válido
```

En ese caso, el estado compartido conserva los recursos válidos y registra el error únicamente en el recurso afectado. Los datos de presentación de Market permanecen separados de los errores de transporte y no modifican el snapshot backend.

---

## 8. Estado actual de la integración

La integración frontend → backend fue probada mediante solicitudes HTTP reales. En la validación local respondieron correctamente:

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

El backend puede proporcionar `source: "ema_fallback"` cuando el upstream no entrega un precio de mercado abierto. Ese valor continúa mostrándose como Data source real; no es reemplazado por la capa visual de Market.

---

## 9. Componentes de la Data Layer

| Módulo | Responsabilidad |
| --- | --- |
| `config.js` | Centraliza `API_URL`, `USE_DEMO_DATA` y `REQUEST_TIMEOUT_MS`. |
| `endpoints.js` | Mantiene en un único lugar las rutas de Health, Oracle y Market. |
| `client.js` | Construye URLs, ejecuta `fetch`, aplica timeout mediante `AbortController`, valida HTTP, parsea JSON y clasifica errores. |
| `normalize.js` | Convierte respuestas del backend en modelos internos consumibles por la UI. |
| `index.js` | Expone la API pública de la Data Layer y centraliza la carga del snapshot. |
| `state.js` | Mantiene `loading`, `lastRefresh`, `snapshot` y errores parciales, además de coordinar el refresh. |
| `utils/time.js` | Centraliza timestamps y cálculo de freshness. |
| `presentation-data.js` | Mantiene exclusivamente los valores visuales de Open Interest, 24h Volume y las series del chart. |

La API pública de la Data Layer contempla:

```
getHealth( )
getOracle()
getMarket()
loadSnapshot()
```

---

## 10. Datos de presentación de Market

El backend actual no entrega `volume24h`, `openInterest` ni `history`. Esos datos se mantienen fuera del modelo Market y se presentan mediante `js/presentation-data.js`:

```
export const PRESENTATION_DATA = Object.freeze({
  openInterest: "$2.84M",
  volume24h: "$1.27M",
});
```

Estos valores son exclusivamente de presentación. No se agregan al payload normalizado, no se envían al backend y no reemplazan `markPrice`, `indexPrice`, `fundingRate`, `maxLeverage`, `marketStatus`, `oracleStatus` ni ningún otro campo real.

| Dato | Fuente de presentación | Regla |
| --- | --- | --- |
| Price | Backend o fixture principal | Nunca se reemplaza por el fixture visual. |
| EMA | Backend o fixture principal | Nunca se reemplaza por el fixture visual. |
| Data source | Backend o fixture principal | Se conserva, por ejemplo `ema_fallback`. |
| Open Interest | `PRESENTATION_DATA.openInterest` | Siempre visible como valor de producto. |
| 24h Volume | `PRESENTATION_DATA.volume24h` | Siempre visible como valor de producto. |
| Price History | `getPresentationHistory(period, { price, ema })` | Serie visual separada y alineada con el último Price/EMA disponible. |

La interfaz muestra actualmente:

```
Open Interest   $2.84M
24h Volume      $1.27M
```

### Series por intervalo

`getPresentationHistory()` prepara una serie coherente para `1H`, `1D` y `1W`. Cada intervalo tiene su propio espaciado temporal y forma visual. El último punto utiliza los valores actuales de Price y EMA cuando el backend los entrega; cuando no existen, utiliza un ancla visual local para evitar que el componente quede vacío.

El cambio de intervalo es puramente visual. No realiza requests históricos ni modifica los datos principales del snapshot.

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

El backend no garantiza actualmente:

```
volume24h
openInterest
change24h
history
hyperCoreStatus
hyperEvmStatus
```

La normalización mantiene esos campos fuera del modelo Market. La capa de presentación los maneja de forma independiente únicamente para completar la interfaz visual.

`change24h`, cuando se muestra en el hero de Market, proviene de `oracle.pctChange`. No se lee desde un campo inexistente de Market.

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

El frontend no asume que `reportedCcl === impliedCcl` ni crea un valor CCL artificial. El slot visual utiliza el valor reportado o implícito únicamente cuando el payload lo entrega.

### Circuit Breaker

Health puede entregar:

```
frozen
frozenPrice
frozenAt
reason
consecutiveOk
thresholdPct
releaseTicks
```

Oracle puede aportar además:

```
deviation
breakerReason
frozenAt
```

El controlador combina Health y Oracle conservando únicamente propiedades disponibles. El estado `FROZEN` se deriva cuando `frozen === true`; el estado `CLEAR` puede representarse cuando `frozen === false` o cuando el backend lo entrega explícitamente. `thresholdPct`, `deviation` y `fundingRate` se conservan como ratios en el modelo y se convierten a porcentaje sólo durante la presentación.

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

El frontend normaliza todas estas ramas antes de utilizarlas. Infrastructure consume Health, Oracle y Market normalizados, pero no infiere HyperCore o HyperEVM desde HIP-3 cuando el backend no entrega esos estados.

---

## 14. Timestamps y freshness

`utils/time.js` centraliza la conversión de:

| Formato | Soporte |
| --- | --- |
| Unix seconds | Sí |
| Unix milliseconds | Sí |
| ISO strings | Sí |
| `null` / `undefined` | Sí |
| Fecha inválida | Se conserva como ausencia segura |

Los timestamps Unix expresados en segundos se convierten a milisegundos antes de crear objetos `Date`. La freshness se calcula a partir del timestamp disponible del recurso. `health.oracle.lastFetchOkAt` se mantiene separado para distinguir frescura del precio y salud del upstream.

---

## 15. Errores y recursos parciales

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

Los errores técnicos y los stack traces no se muestran al usuario. La UI utiliza los mecanismos existentes para representar estados de error:

```
safeErrorMessage
emptyNotice
statusBadge
```

Cuando un recurso falla, conserva su error sin ocultar los datos válidos de los demás recursos. La capa de presentación de Market sigue siendo local y separada; no convierte un error del backend en datos reales ni modifica los recursos normalizados.

---

## 16. Demo mode y real mode

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
page controllers
     ├── datos principales demo
     └── presentation-data.js
     ↓
UI
```

En este modo no se realizan solicitudes HTTP. La capa visual de Volume, Open Interest e histórico se mantiene idéntica al modo real.

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
page controllers
 ├── datos principales backend
 └── presentation-data.js
 ↓
UI
```

No existe fallback silencioso a demo. Si el backend devuelve un error, el recurso conserva su error. Price, EMA y demás datos reales no se reemplazan por la capa visual. Open Interest, 24h Volume y el histórico continúan disponibles como presentación independiente.

---

## 17. Blockchain, wallet y contratos

Infrastructure incorpora una consulta **read-only** independiente de la Data Layer HTTP para presentar el estado on-chain de Hyperliquid Testnet. La metadata estática de deployment se conserva en `infra/onchain-data.js`; `infra/infrastructure.js` consulta `eth_chainId`, `eth_blockNumber`, `eth_getCode`, `eth_getTransactionByHash` y `eth_getTransactionReceipt` mediante JSON-RPC estándar, sin librerías externas.

El deployment documentado corresponde a `Hyperliquid Testnet`, Chain ID `998`, bloque `62293050`, mercado visible `YPF-USDC`, underlying `YPF` y leverage máximo `5x`. La ruta técnica backend se mantiene como `/market/YPF-PERP` hasta una futura migración coordinada. El contrato espejo auditable real del repositorio es `YPFOracle`, por lo que la tarjeta HyperEVM muestra su dirección `0xb4daFE6f02F32b590da1758cCea04DE70F08555A`; `KinetiqLaunchMock` se identifica explícitamente como mock de rehearsal y no como HyperCore productivo.

La UI diferencia metadata registrada de evidencia RPC. `CONNECTED` exige chain ID y latest block válidos en la red esperada; `DEPLOYED` exige bytecode no vacío o una confirmación de receipt coherente; `NOT DEPLOYED` representa código vacío; `SUCCESS` deriva de un receipt con status `0x1`; y un fallo o mismatch de RPC queda como `UNAVAILABLE` o `ERROR`. La arquitectura conceptual puede seguir mostrando HIP-3, HyperCore y YPFOracle, pero no se marcan como `ACTIVE` o `CONNECTED` sin una señal verificable.

La integración no firma, no conecta wallet, no ejecuta transacciones y no realiza llamadas ABI. Las carpetas `js/blockchain/` y `js/wallet/` siguen siendo documentación/placeholders para esas capacidades futuras. Los contratos se encuentran fuera del frontend, en `../contracts/`, y no fueron modificados.

---

## 18. Tests y validación

El frontend dispone de un smoke test sin dependencia de red:

```bash
node tests/smoke.mjs
```

El test cubre:

- Normalización completa e incompleta de Oracle.

- Normalización de Market y Health.

- Timestamps y freshness.

- Circuit Breaker y CCL.

- Preservación del cero real de `fundingRate`.

- Ausencia de campos no soportados en el modelo Market.

- Valores de presentación de Volume y Open Interest.

- Series visuales para `1H`, `1D` y `1W` alineadas con Price/EMA.

- Errores de configuración, red, timeout, abort, HTTP, JSON inválido y payload inválido.

- Demo mode y real mode.

- Metadata de deployment Hyperliquid Testnet, parsing hexadecimal, bytecode y estados de receipts on-chain.

La sintaxis de los módulos principales se puede validar con:

```bash
for file in $(find js markets oracle infra -name '*.js' -type f | sort ); do
  node --check "$file"
done
node --check server.cjs
```

En la validación end-to-end local también se ejecutó la suite del backend, con **58 tests aprobados y 0 fallos**, sin modificar el código backend.

---

## 19. Estado de la Fase 2

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
| Metadata estática de deployment Hyperliquid Testnet | Completado |
| Verificación RPC read-only en Infrastructure | Completado con fallback explícito a metadata |
| CORS de desarrollo local | Verificado en entorno local |
| Health, Oracle y Market | Conectados |
| Timestamps y freshness | Completado |
| Circuit Breaker | Completado |
| CCL separado | Completado |
| Campos opcionales | Completado |
| Presentation data | Completado para Volume, Open Interest e histórico visual |
| Intervalos 1H / 1D / 1W | Completado para presentación visual |
| Smoke tests | Completado |
| Validación de sintaxis | Completado |

### Pendiente

| Área | Estado |
| --- | --- |
| Reemplazar Volume y Open Interest visuales por campos backend | Pendiente de ampliación del contrato Market |
| Reemplazar el histórico visual por histórico backend | Pendiente de endpoint o payload histórico |
| Verificación directa HIP-3 / HyperCore | No disponible; permanece `UNAVAILABLE` sin fuente inequívoca |
| Configuración de producción para `API_URL` | Pendiente |
| Validación contra backend desplegado en VPS | Pendiente |
| Escritura, firma y transacciones blockchain | Fuera de alcance |
| Integración wallet | Fuera de alcance |

Los valores visuales actuales están deliberadamente aislados en `presentation-data.js`. Cuando el backend exponga los campos correspondientes, se podrá sustituir esa fuente sin alterar el contrato de Price, EMA, CCL, Breaker ni el resto de la UI.

---

## 20. Principios de implementación

La integración sigue estos principios:

1. HTML semántico antes que abstracciones innecesarias.

1. CSS separado de la lógica.

1. JavaScript Vanilla sin frameworks.

1. Los controladores de página no realizan solicitudes HTTP directas.

1. Las URLs del backend viven únicamente en la Data Layer.

1. Las respuestas del backend se normalizan antes de llegar a la UI.

1. Los datos reales nunca son reemplazados por datos de presentación.

1. Los datos de presentación se mantienen en un módulo separado y explícito.

1. Volume, Open Interest e histórico pueden completarse visualmente mientras el contrato backend no los exponga.

1. Blockchain y wallet permanecen desacoplados del flujo HTTP.

1. El contrato real del backend es la fuente de verdad para los datos disponibles.

1. Los cambios de entorno no requieren modificar cada página.

1. La interfaz existente se conserva mientras se completa la integración.

---

## 21. Estructura del repositorio completo

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

La organización mantiene separados backend, contratos y frontend. Las futuras integraciones blockchain y wallet deberán incorporarse mediante capas específicas sin contaminar la Data Layer HTTP ni la capa visual de presentación.

---

## Referencias

1. [Repositorio AustralFinance](https://github.com/yumanyer/front-Austra)

1. [Commit `datos hardcodeado-ok`](https://github.com/yumanyer/front-Austra/commit/8dc7887a)

1. [README actual del frontend](https://github.com/yumanyer/front-Austra/blob/main/frontend/README.md)

1. [Data Layer del frontend](https://github.com/yumanyer/front-Austra/tree/main/frontend/js/api)

1. [Capa de presentación visual](https://github.com/yumanyer/front-Austra/blob/main/frontend/js/presentation-data.js)

1. [Smoke test](https://github.com/yumanyer/front-Austra/blob/main/frontend/tests/smoke.mjs)

> Este README describe la implementación vigente del frontend, incluida la capa on-chain read-only de Infrastructure y sus limitaciones verificables.