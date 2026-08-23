# Fase 2 — Data Layer del frontend

> **Estado del documento:** implementación de la Data Layer y registro de validación end-to-end. El backend local fue auditado; Health, Oracle y Market respondieron correctamente con el contrato disponible.

## 1. Propósito y alcance

La Fase 2 prepara el frontend de AustralFinance para consumir el backend real mediante una capa de datos desacoplada. La interfaz visual fue reorganizada y aprobada en el commit [`9f192c6f`](https://github.com/yumanyer/front-Austra/commit/9f192c6f), identificado como `UUXX`; la implementación de la Data Layer se completó posteriormente y se valida en este documento.

En esta implementación se modificó únicamente el frontend dentro del alcance de la Data Layer y el cierre visual read-only de Infrastructure. Los cambios HTML/CSS conservan branding, layout, tipografías, colores, responsive y navegación; no se alteraron Market, Oracle, backend, contratos ni wallet. Además de las requests HTTP contra `/health`, `/oracle/price/YPF` y `/market/YPF-PERP`, Infrastructure consulta el JSON-RPC público configurado de Hyperliquid Testnet sólo para verificar estado on-chain, sin firmar ni enviar transacciones.

`YPF-USDC` es el símbolo visible del frontend. `/market/YPF-PERP` se conserva como ruta técnica porque es el endpoint que el backend actual implementa; esta tarea no migra la identidad del backend ni la del mercado HIP-3.

La especificación de referencia vigente es `pasted_content_5.txt`, con `pasted_content_4.txt` como contexto inmediato de implementación. El estado observado incluye el backend local sincronizado y el frontend sobre el que se aplicó la Data Layer.

## 2. Estado actual observado

La base ya contiene HTML real por interfaz, hojas CSS separadas, scripts específicos por página, datos mock conservados, componentes reutilizables y carpetas preparadas para integraciones futuras. La siguiente tabla distingue lo que ya está disponible de lo que todavía no debe considerarse implementado.

| Área | Estado actual | Evidencia en el repositorio | Evaluación para Fase 2 |
|---|---|---|---|
| HTML por página | Implementado | [`markets/market.html`](../markets/market.html), [`oracle/oracle.html`](../oracle/oracle.html), [`infra/infrastructure.html`](../infra/infrastructure.html) | Base correcta; no requiere rediseño |
| CSS global y responsive | Implementado | [`css/root.css`](../css/root.css), [`css/media.css`](../css/media.css) | Fuera del alcance de esta fase documental |
| JavaScript por página | Implementado | [`markets/market.js`](../markets/market.js), [`oracle/oracle.js`](../oracle/oracle.js), [`infra/infrastructure.js`](../infra/infrastructure.js) | Consume snapshot normalizado y actualiza el DOM existente |
| Componentes comunes | Implementado | [`js/components/common.js`](../js/components/common.js), [`js/components/chart.js`](../js/components/chart.js) | Reutilizables; no deben incorporar transporte de backend |
| Utilidades | Implementado | [`js/utils/format.js`](../js/utils/format.js), [`js/utils/time.js`](../js/utils/time.js) | Formateo y timestamps centralizados |
| Normalización | Implementado | [`js/api/normalize.js`](../js/api/normalize.js) | Modelos Health, Oracle y Market con campos opcionales explícitos |
| API client | Implementado | [`js/api/client.js`](../js/api/client.js) | Transporte central con timeout, AbortController y errores clasificados |
| Catálogo de endpoints | Implementado | [`js/api/endpoints.js`](../js/api/endpoints.js) | Rutas centralizadas sin duplicación en page controllers |
| Configuración de API | Implementado | [`js/api/config.js`](../js/api/config.js) | `API_URL`, `USE_DEMO_DATA`, timeouts HTTP y RPC centralizados |
| Estado compartido | Implementado | [`js/state.js`](../js/state.js) | `loading`, `lastRefresh`, snapshot, refresh deduplicado y errores parciales |
| Demo mode | Implementado | [`js/demo-data.js`](../js/demo-data.js) y `loadPageSnapshot()` | Debe mantenerse aislado del modo real |
| Manejo de errores | Implementado | [`js/api/client.js`](../js/api/client.js), `emptyNotice()` y `statusBadge()` | Códigos de configuración, red, timeout, abort, HTTP, JSON y payload |
| Tests | Implementado | [`tests/smoke.mjs`](../tests/smoke.mjs) | Cubre Health, Oracle, Market, tiempo, breaker, CCL, ausencias, errores y modos |
| Infrastructure on-chain | Implementado como consulta RPC read-only | [`../infra/infrastructure.js`](../infra/infrastructure.js), [`../infra/onchain-data.js`](../infra/onchain-data.js), [`../infra/onchain-utils.js`](../infra/onchain-utils.js) | Chain ID, latest block, bytecode y receipts; fallback explícito a metadata |
| Blockchain transaccional | No integrado | [`js/blockchain/README.md`](../js/blockchain/README.md) | Sin ABI, firma ni escritura |
| Wallet | Deliberadamente no integrado | [`js/wallet/README.md`](../js/wallet/README.md) | Debe permanecer sin integración |

## 3. Arquitectura implementada

La separación implementada en el frontend es la siguiente:

```text
HTML estático
    │
    ▼
JavaScript de página
    │  sólo coordina ciclo de vida y DOM existente
    ▼
Estado compartido normalizado
    │
    ▼
Data layer
    ├── client.js       transporte HTTP, timeout, JSON y errores HTTP
    ├── endpoints.js    catálogo único de rutas
    ├── normalize.js    backend JSON → modelo frontend
    └── index.js        API pública de la capa
    │
    ▼
Backend configurado
    ├── GET /health
    ├── GET /oracle/price/YPF
    ├── GET /market/YPF-PERP

Infrastructure on-chain read-only
    ├── eth_chainId
    ├── eth_blockNumber
    ├── eth_getCode
    ├── eth_getTransactionByHash
    └── eth_getTransactionReceipt
```

Las páginas Market, Oracle e Infrastructure deben consumir el mismo snapshot del ciclo de carga correspondiente. Ninguna página debe realizar un `fetch` directo, repetir rutas de backend, interpretar el JSON crudo o cargar un recurso que pertenece a otra página. El flujo deseado es:

```text
Backend JSON
    ↓
API client
    ↓
Normalización y validación
    ↓
Snapshot compartido
    ↓
Market / Oracle / Infrastructure
    ↓
Hidratación del DOM existente
```

La estructura implementada para `frontend/js/api/` es la siguiente:

| Módulo conceptual | Responsabilidad | No debe contener |
|---|---|---|
| `client.js` | Resolver la URL base configurada, ejecutar `fetch`, establecer headers, aplicar timeout, validar HTTP, parsear JSON y clasificar errores | Campos de Market, Oracle o Health |
| `endpoints.js` | Definir `HEALTH`, `ORACLE_PRICE` y `MARKET` en un único lugar | Lógica de renderizado o URLs duplicadas |
| `normalize.js` | Convertir respuestas backend a modelos internos, adaptar timestamps, unidades, breaker y campos opcionales | `fetch`, acceso al DOM o HTML |
| `index.js` | Exponer la API pública de la data layer | Conocer detalles visuales de las páginas |

## 4. Configuración y contratos de endpoint

La configuración debe continuar siendo central y modificable sin editar cada página. La especificación vigente identifica como endpoints de esta fase los siguientes:

| Nombre lógico | Método | Ruta | Uso previsto |
|---|---:|---|---|
| `HEALTH` | `GET` | `/health` | Estado del sistema, Oracle, breaker, HIP-3 y pusher cuando estén presentes |
| `ORACLE_PRICE` | `GET` | `/oracle/price/YPF` | Precio, EMA, referencias de mercado y señales del breaker |
| `MARKET` | `GET` | `/market/YPF-PERP` | Instrumento técnico; la UI lo presenta como `YPF-USDC`, junto con precios, funding, leverage y señales HIP-3 |

La base de URL de desarrollo puede ser `http://localhost:3000`, pero ese valor no debe quedar hardcodeado dentro de `market.js`, `oracle.js`, `infrastructure.js` ni en normalizadores. La configuración aplicada mantiene HTTP y RPC read-only separados:

```js
window.AUSTRAL_CONFIG = {
  API_URL: "http://localhost:3000",
  USE_DEMO_DATA: false,
  RPC_URL: "https://rpc.hyperliquid-testnet.xyz/evm",
  RPC_TIMEOUT_MS: 5000
};
```

`RPC_URL` sólo alimenta la consulta on-chain de Infrastructure. Si el endpoint no responde, si devuelve una cadena distinta de `998` o si una respuesta no puede comprobarse, la UI conserva metadata registrada pero muestra el estado verificable como `UNAVAILABLE` o `ERROR`; no activa un fallback demo silencioso.

## 5. Modelo normalizado de Oracle

La UI debe recibir un modelo estable y desacoplado del JSON del backend. El modelo propuesto conserva los campos que ya utiliza el frontend y agrega únicamente señales que tengan correspondencia real en el backend.

```text
OracleModel
├── symbol
├── price
├── ema
├── lastPrint
├── bid
├── ask
├── spread
├── ccl
├── impliedCcl
├── crossCheck
├── status
├── source
├── marketOpen
├── freshness
├── timestamp
├── lastPrintAt
└── circuitBreaker
    ├── status
    ├── frozen
    ├── reason
    ├── frozenPrice
    ├── frozenAt
    ├── consecutiveOk
    ├── threshold
    ├── thresholdPct
    ├── deviation
    └── releaseTicks
```

La presencia de una propiedad en este esquema no implica que deba rellenarse. Cada campo debe conservar `undefined`, `null` o el estado `UNAVAILABLE` cuando la respuesta no lo contenga. La UI no debe recibir valores mock como sustituto silencioso en modo real.

### 5.1 Mapping de Oracle

| Campo del backend documentado | Campo normalizado | Regla documental |
|---|---|---|
| `price` | `oracle.price` | Mapear si existe y es legible |
| `ema` | `oracle.ema` | Mapear sin calcular un valor alternativo |
| `lastPrint` | `oracle.lastPrint` | Mapear; considerar `lastPrintAt` por separado |
| `bid` | `oracle.bid` | Mapear si existe |
| `ask` | `oracle.ask` | Mapear si existe |
| `spread` o `spreadPct` | `oracle.spread` | No asumir que representan la misma unidad |
| `impliedCcl` | `oracle.impliedCcl` | Mapear explícitamente |
| `crossCheck` o su objeto equivalente | `oracle.crossCheck` | Preservar el estado disponible, sin inventar `PASS` |
| `status` | `oracle.status` | Normalizar mayúsculas y separadores sólo como representación |
| `source` | `oracle.source` | Mapear si el backend lo entrega |
| `marketOpen` | `oracle.marketOpen` | Mapear booleano sin inferirlo desde el horario local |
| `timestamp` | `oracle.timestamp` y/o `oracle.freshness` | Normalizar unidades antes de usar `Date` |
| `lastPrintAt` | `oracle.lastPrintAt` | Mantener separado de `timestamp` si ambos existen |
| `deviation` | `oracle.circuitBreaker.deviation` | No convertir sin confirmar unidad |
| `breakerReason` | `oracle.circuitBreaker.reason` | Mapear como motivo, no como estado |
| `frozenAt` | `oracle.circuitBreaker.frozenAt` | Normalizar tiempo si es Unix seconds |

### 5.2 Política de CCL

La especificación indica que el backend puede entregar `reportedCcl`, `impliedCcl`, `cclSampled` y `cclDeviation`, mientras que el modelo histórico de la UI utiliza `ccl` e `impliedCcl`. Por lo tanto, no debe asumirse que `reportedCcl === ccl` sin una decisión de contrato explícita.

La política recomendada para la futura implementación es conservar primero los nombres de origen (`reportedCcl`, `cclSampled`, `cclDeviation`) dentro del modelo normalizado cuando estén disponibles. El alias `ccl` sólo debe asignarse cuando el contrato del backend confirme que `reportedCcl` es el valor que la UI históricamente denomina CCL. Esa decisión debe quedar comentada en `normalize.js` y cubierta por un test. Si no hay confirmación, `ccl` debe permanecer no disponible en vez de utilizar un valor inferido.

## 6. Freshness y timestamps

La fuente backend puede expresar timestamps Unix en segundos, mientras que `Date` en JavaScript utiliza milisegundos. La conversión debe existir en una única utilidad de la data layer y no repetirse en cada página o componente.

La secuencia documental obligatoria es:

```text
timestamp Unix en segundos
        ↓ × 1000
timestamp Unix en milisegundos
        ↓
Date válido
        ↓
freshness / relativeTime
```

La futura implementación debe distinguir al menos estos casos:

| Entrada | Tratamiento esperado |
|---|---|
| Número Unix en segundos | Convertir a milisegundos antes de construir `Date` |
| Número Unix en milisegundos | Usar como milisegundos |
| String ISO | Parsear como fecha ISO |
| Valor ausente | Entregar `undefined`, `null` o `UNAVAILABLE` según el contrato de UI |
| Fecha inválida | No mostrar excepción técnica; clasificar como dato no disponible o inválido |

No se debe utilizar directamente `new Date(timestamp)` para un timestamp numérico si el contrato lo expresa en segundos. La política exacta de detección de unidad deberá documentarse en el normalizador cuando se implemente.

## 7. Circuit Breaker

El backend puede entregar un objeto `breaker` desde `/health` con `frozen`, `frozenPrice`, `frozenAt`, `reason`, `consecutiveOk`, `thresholdPct` y `releaseTicks`. Oracle también puede entregar `deviation`, `breakerReason` y `frozenAt`. El adaptador debe conservar la información disponible sin convertirla en afirmaciones que el backend no respalda.

| Señal | Modelo interno sugerido | Regla |
|---|---|---|
| `breaker.frozen` | `circuitBreaker.frozen` | Booleano explícito; no inferirlo desde un badge visual |
| `breaker.frozenPrice` | `circuitBreaker.frozenPrice` | Conservar si existe |
| `breaker.frozenAt` | `circuitBreaker.frozenAt` | Normalizar como timestamp |
| `breaker.reason` o `breakerReason` | `circuitBreaker.reason` | Conservar texto seguro, sin stack trace |
| `breaker.consecutiveOk` | `circuitBreaker.consecutiveOk` | No presentarlo como release progress si el contrato no lo define así |
| `breaker.thresholdPct` | `circuitBreaker.thresholdPct` | Mantener la unidad de origen hasta confirmarla |
| `breaker.releaseTicks` | `circuitBreaker.releaseTicks` | No inventar el total ni el progreso |
| `oracle.deviation` | `circuitBreaker.deviation` | No multiplicar ni convertir arbitrariamente |

El campo visual `status` puede conservarse cuando el backend lo entregue explícitamente. Si sólo existe `frozen: true`, la UI puede representar un estado congelado porque la señal es directa. Si no existe una señal suficiente, el estado debe ser `UNAVAILABLE`; no debe aparecer `CLEAR`, `PASS` o un progreso de liberación fabricado.

## 8. Unidades y presentación

La diferencia entre los valores demo y backend requiere una política explícita. El backend real entrega `thresholdPct` como `0.1`, que representa una fracción equivalente a 10%; la interfaz aplica una conversión explícita sólo al formatear el valor como `10.00%`. El fixture demo utiliza la misma unidad ratio.

La implementación registra por campo la unidad esperada, la unidad recibida y la transformación aplicada sólo cuando corresponde a presentación. El contrato confirmado establece:

| Campo | Pregunta que debe resolver el contrato |
|---|---|
| `thresholdPct` | `0.1` como ratio equivalente a 10%; se multiplica por 100 sólo en presentación |
| `deviation` | Ratio; se multiplica por 100 sólo en presentación |
| `pctChange` | Porcentaje directo, por ejemplo `0.65` para `0.65%` |
| `fundingRate` | Ratio financiero; se multiplica por 100 sólo en presentación |
| `spread` / `spreadPct` | `spread` es diferencia absoluta; `spreadPct` es ratio |

Con esas unidades confirmadas, la Data Layer conserva los valores de origen y aplica la conversión sólo en la presentación. La normalización y la presentación mantienen responsabilidades separadas, y las conversiones son únicas, explícitas y testeadas.

## 9. Modelo normalizado de Health

`/health` es el punto de agregación para datos operativos. El modelo propuesto es el siguiente:

```text
HealthModel
├── status
├── timestamp
├── oracle
│   ├── symbol
│   ├── status
│   ├── source
│   ├── marketOpen
│   ├── lastFetchOkAt
│   ├── consecutiveFailures
│   ├── pollIntervalMs
│   └── simulatedWalk
├── breaker
│   ├── frozen
│   ├── frozenPrice
│   ├── frozenAt
│   ├── reason
│   ├── consecutiveOk
│   ├── thresholdPct
│   └── releaseTicks
├── hip3
│   ├── enabled
│   ├── dryRun
│   ├── isTestnet
│   ├── market
│   ├── publishIntervalMs
│   ├── publishing
│   ├── publishCount
│   ├── lastPublishAt
│   ├── lastPublishedPx
│   ├── consecutiveFailures
│   ├── lastError
│   ├── staleSkips
│   └── skippingStale
└── pusher
    ├── enabled
    ├── contract
    ├── intervalMs
    ├── lastPushTx
    └── lastPushAt
```

La normalización de Health debe preservar la ausencia de cada subobjeto. Por ejemplo, si el backend no informa `hip3.enabled`, Infrastructure no debe convertir la mera existencia del concepto HIP-3 en un estado `ACTIVE`. Los conceptos arquitectónicos `HyperCore`, `HyperEVM` y `YPFOracle` pueden permanecer visibles como información estática, pero sólo pueden recibir un estado operativo si existe una señal backend o RPC inequívoca.

## 10. Modelo normalizado de Market

El modelo Market debe concentrarse en el instrumento y sus señales disponibles:

```text
MarketModel
├── symbol
├── markPrice
├── indexPrice
├── fundingRate
├── maxLeverage
├── marketStatus
├── hip3
├── oracleStatus
├── oracleSource
├── simulated
├── lastPushTx
└── lastPushAt
```

Los campos `volume24h`, `openInterest`, `history`, `hyperCoreStatus` y `hyperEvmStatus` no forman parte del modelo normalizado porque el backend no los proporciona. Para completar la presentación visual sin contaminar la respuesta backend, `js/presentation-data.js` mantiene separados Open Interest `$2.84M`, 24h Volume `$1.27M` y una serie Price/EMA por intervalo. `change24h` tampoco se lee desde Market: cuando se muestra el cambio del hero, proviene únicamente de `oracle.pctChange`. Price y EMA del último punto del chart se alinean con los valores reales cuando están disponibles; la serie anterior es exclusivamente visual.

La normalización actual trata `hip3.*` como un submodelo cuando el backend lo entrega. No infiere `HyperCore` o `HyperEVM` a partir de `hip3` porque esos estados no están presentes en el contrato Market.

## 11. Snapshot y estado compartido

El modelo compartido esperado es conceptualmente:

```text
AppState
├── loading
├── lastRefresh
└── snapshot
    ├── health
    ├── oracle
    └── market
```

La carga de snapshot debe solicitar los tres recursos en un ciclo controlado y, preferentemente, en paralelo. La regla de diseño es que Market, Oracle e Infrastructure no hagan requests entre sí ni dupliquen `/health` de forma independiente:

```text
Una carga de snapshot
    ├── /health
    ├── /oracle/price/YPF
    └── /market/YPF-PERP
             ↓
     normalización individual
             ↓
       snapshot compartido
```

[`js/state.js`](../js/state.js) implementa un store compartido con `loading`, `lastRefresh`, snapshot normalizado, suscripciones y deduplicación de refresh. En demo mode carga el fixture a través de los mismos normalizadores; en real mode invoca una sola vez la API pública de [`js/api/index.js`](../js/api/index.js) y conserva el estado individual de cada recurso cuando alguno falla.

## 12. Demo mode y modo real

La separación de modos debe ser estricta:

```text
USE_DEMO_DATA=true
        ↓
js/demo-data.js
        ↓
modelo normalizado interno
        ↓
UI
```

```text
USE_DEMO_DATA=false
        ↓
API client
        ↓
normalización
        ↓
snapshot compartido
        ↓
UI
```

No debe existir una mezcla silenciosa entre backend real y valores de presentación. Price, EMA, Data source, CCL, Breaker, funding, mark e index conservan exclusivamente el backend o el fixture principal seleccionado por `USE_DEMO_DATA`. Open Interest, 24h Volume y el histórico del chart provienen de `presentation-data.js` como capa visual explícita y no se incorporan al modelo Market.

En el estado actual, `USE_DEMO_DATA=true` y `USE_DEMO_DATA=false` conservan la misma presentación visual: los datos principales cambian entre fixture y backend, mientras Open Interest, 24h Volume y el histórico se leen de la capa de presentación independiente. Los datos visuales no sobrescriben Price, EMA, CCL, Breaker, funding, mark, index ni otros campos reales.

## 13. Manejo de errores

La data layer futura debe distinguir las siguientes clases, sin exponer detalles técnicos al usuario:

| Categoría | Ejemplo interno | Representación esperada |
|---|---|---|
| HTTP error | Respuesta `4xx` o `5xx` | Recurso con error clasificado y aviso visual seguro |
| Network error | No se pudo establecer conexión | Estado no disponible y aviso de servicio |
| Timeout | Abort por límite de tiempo | Mensaje equivalente a timeout, sin stack trace |
| Invalid JSON | Respuesta no parseable | Error de payload inválido |
| Missing field | Campo obligatorio ausente | Modelo parcial y campo visual `UNAVAILABLE` |
| Unavailable data | Recurso o campo opcional ausente | Badge o valor `—` según la UI |

Las funciones existentes `safeErrorMessage`, `emptyNotice` y `statusBadge` deben reutilizarse cuando corresponda. Los componentes visuales no deben recibir excepciones crudas ni renderizar `TypeError: Cannot read properties...`. La página debe poder mostrar un snapshot parcial: un error de Market no debe borrar automáticamente un Oracle válido, y viceversa.

## 14. Responsabilidades de las páginas

| Página | Consume | Debe hacer | No debe hacer |
|---|---|---|---|
| Market | `snapshot.market`, `snapshot.oracle`, datos de Health que correspondan | Actualizar precios, métricas, estados, chart e interacciones del DOM existente | Hacer `fetch`, interpretar JSON crudo o pedir Oracle por su cuenta |
| Oracle | `snapshot.oracle`, Health normalizado cuando sea necesario | Actualizar pipeline, métricas, EMA, breaker y avisos | Inferir estados o consultar `/health` directamente |
| Infrastructure | `snapshot.health`, `snapshot.oracle`, `snapshot.market.hip3` y RPC read-only | Actualizar estados backend disponibles, metadata de deployment y verificación on-chain | Afirmar estados de HyperCore/HIP-3 sin evidencia, firmar o hacer requests HTTP duplicadas |

El `innerHTML` queda reservado para piezas pequeñas realmente reutilizables, como un badge, un aviso seguro o el SVG del chart si el componente lo necesita. No debe utilizarse para reconstruir páginas completas ni para reemplazar el shell visual.

## 15. Tests implementados y ejecutados

El smoke test actual cubre la normalización y el comportamiento de la Data Layer sin requerir un backend activo. La cobertura implementada incluye:

| Suite | Casos requeridos |
|---|---|
| Oracle | `price`, `ema`, `lastPrint`, `bid`, `ask`, `spread`, `impliedCcl`, `crossCheck`, `status`, `source`, `marketOpen` |
| Market | `symbol`, `markPrice`, `indexPrice`, `fundingRate`, `maxLeverage`, `marketStatus`, `hip3` |
| Health | `status`, `oracle.status`, `breaker.frozen`, `breaker.thresholdPct`, `hip3.enabled`, `pusher.enabled` |
| Timestamps | Unix seconds a milliseconds, Unix milliseconds, ISO, ausencia y fecha inválida |
| Freshness | Selección de `timestamp` o `lastPrintAt`, cálculo seguro de `relativeTime` |
| Breaker | `frozen`, precio congelado, motivo, timestamp, ticks, valores ausentes y status no inventado |
| CCL | `reportedCcl`, `impliedCcl`, `cclSampled`, `cclDeviation`, alias `ccl` sólo con política explícita |
| Unidades | Ratios y porcentajes conservados en el modelo; conversiones explícitas sólo para presentación |
| Ausencias y presentación | El modelo backend mantiene ausencias; `presentation-data.js` aporta sólo valores visuales de Volume, OI e histórico |
| Demo/real | Demo sin requests; modo real sin fallback silencioso a fixture |
| On-chain | Metadata Hyperliquid Testnet, parsing hex, bytecode, receipts y estados RPC sin red |

Los tests deben seguir siendo unitarios o de normalización y no deben requerir que el backend esté ejecutándose. Cualquier test HTTP deberá pertenecer a una suite de integración separada y explícita, fuera del smoke test básico.

## 16. Criterios de aceptación de la implementación

La siguiente lista registra el estado de la implementación actual. El contrato backend local fue inspeccionado; la única limitación de runtime observada fue la indisponibilidad del upstream Data912 durante el arranque del Oracle.

| Criterio | Estado documental actual |
|---|---|
| El diseño visual se mantiene sin cambios | **Base existente aprobada; no se toca** |
| El HTML continúa siendo responsable de la estructura | **Cumplido en la base actual** |
| Los scripts hidratan el DOM existente | **Implementado mediante snapshot normalizado** |
| No se generan páginas completas con JavaScript | **Cumplido en la base actual** |
| Existe una API/data layer separada | **Implementado: config, endpoints, client, normalize e index** |
| No hay URLs backend duplicadas | **Implementado mediante `endpoints.js` y `config.js`** |
| `/health` está normalizado | **Implementado con status, timestamp, oracle, breaker, hip3 y pusher opcionales** |
| `/oracle/price/YPF` está normalizado | **Implementado con Oracle, CCL, timestamps, breaker y pipeline opcional** |
| `/market/YPF-PERP` está normalizado | **Implementado con Market, hip3, histórico y campos opcionales** |
| Timestamps correctamente normalizados | **Implementado y cubierto por tests** |
| Circuit Breaker adaptado sin inventar información | **Implementado; deriva `FROZEN` sólo con `frozen === true`** |
| CCL tratado explícitamente | **Implementado; `ccl` no se deriva de `reportedCcl`** |
| Campos inexistentes no se rellenan con demo | **Implementado en normalizadores y cubierto por tests** |
| Demo mode funciona | **Cumplido en la base actual** |
| Real mode queda preparado | **Implementado y probado contra backend local; datos principales reales y visuales separados** |
| Market consume modelo normalizado | **Implementado; no accede a `raw`** |
| Oracle consume modelo normalizado | **Implementado; no accede a `raw`** |
| Infrastructure consume datos disponibles | **Implementado desde Health, Oracle, Market normalizados y RPC read-only** |
| Infrastructure distingue metadata de evidencia RPC | **Implementado: CONNECTED, DEPLOYED, SUCCESS, UNAVAILABLE, ERROR y NOT DEPLOYED según señal** |
| Blockchain transaccional sigue sin integración | **Cumplido: no hay ABI, firma ni escritura** |
| Wallet sigue sin integración | **Cumplido y debe preservarse** |
| Smoke tests cubren adaptaciones | **Implementado y ejecutado** |
| `node --check` continúa pasando | **Validado para los módulos relevantes** |
| README describe arquitectura y limitaciones | **Implementado en `frontend/README.md`** |
| Backend no se modifica | **Regla vigente** |
| Metadata y receipts de deployment se presentan read-only | **Implementado con fallback explícito** |

## 17. Validación contra el backend real
La implementación se ejecutó sobre la copia local completa y el backend fue utilizado como fuente de verdad. Se confirmaron las rutas parametrizadas `GET /health`, `GET /oracle/price/:symbol` y `GET /market/:symbol`, sus parámetros `YPF` y `YPF-PERP`, timestamps Unix en segundos, los modelos Oracle/Market y los subobjetos Health. El frontend muestra `YPF-USDC` como alias visual sin cambiar el path técnico. En runtime, `/health`, `/oracle/price/YPF` y `/market/YPF-PERP` respondieron `200` con el backend local. Oracle entregó precio real con `source: "ema_fallback"` y Market entregó `markPrice`, `indexPrice`, `fundingRate: 0`, `maxLeverage` y estado `offline`. El frontend conserva esos campos reales y aplica únicamente la capa visual separada para Volume, Open Interest e histórico.

La revisión final del diff confirmó que los cambios se limitan al frontend: Infrastructure agrega metadata estática de deployment, tarjetas on-chain y verificación JSON-RPC read-only. No se alteraron branding, layout, tipografías, colores, navegación, Market, Oracle, backend, contracts ni wallet. No se agregaron ABI, Web3, ethers, viem, firma o envío de transacciones. HIP-3 y HyperCore permanecen `UNAVAILABLE` porque no existe una señal inequívoca de activación en los recursos consultados.

## 18. Registro de esta entrega

Esta entrega modifica únicamente archivos del frontend dentro del alcance de la Data Layer y el estado on-chain read-only: `infra.html`, `infra.css`, `infrastructure.js`, `onchain-data.js`, `onchain-utils.js`, configuración RPC, smoke tests y documentación. No se modificaron backend, contracts, Market, Oracle ni wallet. El modo demo no ejecuta requests HTTP; en modo real, Infrastructure consulta el RPC configurado con timeout y fallback explícito a metadata. Los contratos YPFOracle y KinetiqLaunchMock fueron verificados por bytecode y receipts `status: 0x1`; la transacción suministrada para `YPF-PERP deployMarket` conserva su hash, pero el RPC devolvió `Invalid params` por longitud hexadecimal impar y se representa como `UNAVAILABLE` sin convertirlo en éxito.

## Referencias

1. [Especificación vigente de implementación — `pasted_content_5.txt`](https://github.com/yumanyer/front-Austra/commit/9f192c6f)
2. [Commit base del refactor estructural `UUXX`](https://github.com/yumanyer/front-Austra/commit/9f192c6f)
3. [API/data layer actual](../js/api/index.js)
4. [Estado actual del frontend](../js/state.js)
5. [Datos mock actuales](../js/demo-data.js)
6. [Smoke test actual](../tests/smoke.mjs)
7. [Metadata on-chain de Infrastructure](../infra/onchain-data.js)
8. [Utilidades de verificación on-chain](../infra/onchain-utils.js)
9. [Especificación vigente de Infrastructure — `pasted_content_9.txt`](https://github.com/yumanyer/front-Austra/blob/main/pasted_content_9.txt)
