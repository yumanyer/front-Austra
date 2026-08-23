# Fase 2 — Data Layer del frontend

> **Estado del documento:** especificación operativa y análisis de brecha. Esta entrega es exclusivamente documental; no implementa cambios de código ni conexiones de red.

## 1. Propósito y alcance

La Fase 2 tiene como objetivo preparar el frontend de AustralFinance para consumir el backend real mediante una capa de datos desacoplada. La interfaz visual ya fue reorganizada y aprobada en el commit [`9f192c6f`](https://github.com/yumanyer/front-Austra/commit/9f192c6f), identificado como `UUXX`. El alcance de este documento es establecer el estado real de esa base, describir las piezas que ya existen, registrar las brechas frente a la especificación vigente y dejar definido el diseño técnico que deberá implementarse en una fase de código posterior.

Durante esta entrega no se modifican los archivos existentes. En particular, no se tocan HTML visual, CSS, layout, tipografías, colores, espaciados, responsive, iconos, backend, contratos, blockchain o wallet. Tampoco se realizan requests contra `/health`, `/oracle/price/YPF` o `/market/YPF-PERP`.

La especificación de referencia es la continuación de Fase 2 contenida en `pasted_content_3.txt`, que a su vez toma `pasted_content_2.txt` como contexto vigente. El estado observado corresponde al working tree limpio posterior al commit `UUXX`.

## 2. Estado actual observado

La base ya contiene HTML real por interfaz, hojas CSS separadas, scripts específicos por página, datos mock conservados, componentes reutilizables y carpetas preparadas para integraciones futuras. La siguiente tabla distingue lo que ya está disponible de lo que todavía no debe considerarse implementado.

| Área | Estado actual | Evidencia en el repositorio | Evaluación para Fase 2 |
|---|---|---|---|
| HTML por página | Implementado | [`markets/market.html`](../markets/market.html), [`oracle/oracle.html`](../oracle/oracle.html), [`infra/infrastructure.html`](../infra/infrastructure.html) | Base correcta; no requiere rediseño |
| CSS global y responsive | Implementado | [`css/root.css`](../css/root.css), [`css/media.css`](../css/media.css) | Fuera del alcance de esta fase documental |
| JavaScript por página | Implementado | [`markets/market.js`](../markets/market.js), [`oracle/oracle.js`](../oracle/oracle.js), [`infra/infrastructure.js`](../infra/infrastructure.js) | Debe conectarse posteriormente a un estado compartido |
| Componentes comunes | Implementado | [`js/components/common.js`](../js/components/common.js), [`js/components/chart.js`](../js/components/chart.js) | Reutilizables; no deben incorporar transporte de backend |
| Utilidades | Implementado parcialmente | [`js/utils/format.js`](../js/utils/format.js) | Requiere política central para tiempo, unidades y estados |
| Normalización | Implementado parcialmente | [`js/api/index.js`](../js/api/index.js) | Cubre algunos campos Oracle, Market y Health, pero no el contrato completo |
| API client | No implementado | No existe `client.js` ni una función de transporte activa | Pendiente de implementación posterior |
| Catálogo de endpoints | No implementado | No existe `endpoints.js` | Pendiente de implementación posterior |
| Configuración de API | Sólo fixture local | `window.AUSTRAL_CONFIG` conserva `USE_DEMO_DATA` | Debe centralizarse antes de conectar backend |
| Estado compartido | Parcial | [`js/state.js`](../js/state.js) expone `loadPageSnapshot()` | No representa todavía `loading`, `lastRefresh` y snapshot real compartido |
| Demo mode | Implementado | [`js/demo-data.js`](../js/demo-data.js) y `loadPageSnapshot()` | Debe mantenerse aislado del modo real |
| Manejo de errores | Parcial | `emptyNotice()` y `statusBadge()` existen | Falta distinguir categorías de error del transporte y validación |
| Tests | Parcial | [`tests/smoke.mjs`](../tests/smoke.mjs) | Faltan pruebas de Health, tiempo, breaker, CCL y campos ausentes |
| Blockchain | Deliberadamente no integrado | [`js/blockchain/README.md`](../js/blockchain/README.md) | Debe permanecer sin integración |
| Wallet | Deliberadamente no integrado | [`js/wallet/README.md`](../js/wallet/README.md) | Debe permanecer sin integración |

## 3. Arquitectura objetivo documentada

La separación buscada para la siguiente implementación de código es la siguiente:

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
    └── GET /market/YPF-PERP
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

La estructura conceptual recomendada para `frontend/js/api/` es la siguiente. Los nombres se documentan como responsabilidades, no como una instrucción para modificar archivos en esta entrega.

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
| `MARKET` | `GET` | `/market/YPF-PERP` | Instrumento, precios perpetuos, funding, leverage y señales HIP-3 |

La base de URL de desarrollo puede ser `http://localhost:3000`, pero ese valor no debe quedar hardcodeado dentro de `market.js`, `oracle.js`, `infrastructure.js` ni en normalizadores. La configuración propuesta es conceptualmente equivalente a:

```js
window.AUSTRAL_CONFIG = {
  API_URL: "http://localhost:3000",
  USE_DEMO_DATA: false
};
```

Este fragmento es una referencia de configuración futura, no una modificación aplicada en esta entrega. La misma configuración debe permitir pasar posteriormente de localhost a una IP de VPS o a un dominio sin cambiar las páginas.

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

La diferencia entre los valores demo y backend requiere una política explícita. La especificación señala como ejemplo que `thresholdPct` podría llegar como `0.1` desde backend, mientras que el fixture utiliza `10`. Esa diferencia no debe resolverse por intuición.

La futura implementación debe registrar por campo la unidad esperada, la unidad recibida y cualquier transformación aplicada. En particular, debe confirmarse el significado de:

| Campo | Pregunta que debe resolver el contrato |
|---|---|
| `thresholdPct` | ¿`0.1` representa 0.1% o una fracción equivalente a 10%? |
| `deviation` | ¿Es porcentaje, puntos porcentuales o ratio? |
| `pctChange` | ¿Llega como `1.24` para 1.24% o como `0.0124`? |
| `fundingRate` | ¿Es porcentaje de presentación o ratio financiero? |
| `spread` / `spreadPct` | ¿Es diferencia absoluta de precio o porcentaje? |

Hasta que esas unidades estén confirmadas, la data layer no debe aplicar conversiones arbitrarias. La normalización y la presentación pueden tener responsabilidades separadas, pero la conversión debe ser única, explícita y testeada.

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

La normalización de Health debe preservar la ausencia de cada subobjeto. Por ejemplo, si el backend no informa `hip3.enabled`, Infrastructure no debe convertir la mera existencia del concepto HIP-3 en un estado `ACTIVE`. Los conceptos arquitectónicos `HyperCore`, `HyperEVM` y `AssetOracle` pueden permanecer visibles como información estática, pero sólo pueden recibir un estado operativo si existe una señal backend inequívoca.

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

Los siguientes campos del fixture actual no deben completarse desde demo cuando `USE_DEMO_DATA=false`: `volume24h`, `openInterest`, `change24h`, `history`, `hyperCoreStatus` y `hyperEvmStatus`. Si el endpoint no los proporciona con una correspondencia clara, deben quedar no disponibles. En particular, la ausencia de histórico debe llevar al estado de chart `Historical data unavailable`; no se debe generar una serie falsa.

La futura normalización debe tratar `hip3.*` como un submodelo cuando el backend lo entregue. No debe inferir `HyperCore` o `HyperEVM` a partir de `hip3` sin evidencia de que esos componentes representan el mismo estado.

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

El estado actual de [`js/state.js`](../js/state.js) sólo expone `loadPageSnapshot()`: devuelve el fixture cuando el modo demo está activo y un snapshot no disponible cuando se solicita modo real. Esto evita conexiones no autorizadas en la base actual, pero todavía no constituye el flujo de API real de la Fase 2. La diferencia queda registrada como pendiente de implementación, no como un defecto que deba resolverse en esta entrega documental.

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

No debe existir una mezcla silenciosa entre backend real y valores del fixture. En modo real, cada campo ausente debe permanecer ausente o adoptar el fallback visual ya existente. El chart no debe reutilizar `history` demo si el endpoint real no la entrega.

En el estado actual, `USE_DEMO_DATA=true` continúa funcionando con el fixture. El camino `USE_DEMO_DATA=false` todavía no consulta API y retorna un estado no disponible deliberado. Esa decisión es coherente con la restricción de no integrar endpoints durante esta entrega, pero debe cambiarse sólo en una futura implementación de código de la Fase 2.

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
| Infrastructure | `snapshot.health`, `snapshot.oracle`, `snapshot.market.hip3` | Actualizar estados disponibles y mantener conceptos arquitectónicos estáticos | Afirmar estados de HyperCore/HyperEVM sin evidencia o hacer requests duplicadas |

El `innerHTML` queda reservado para piezas pequeñas realmente reutilizables, como un badge, un aviso seguro o el SVG del chart si el componente lo necesita. No debe utilizarse para reconstruir páginas completas ni para reemplazar el shell visual.

## 15. Tests documentados como pendientes

Los smoke tests actuales cubren una parte de `normalizeOracle()` y `normalizeMarket()`, pero todavía no cubren el contrato completo de la Fase 2. La matriz mínima futura es la siguiente:

| Suite | Casos requeridos |
|---|---|
| Oracle | `price`, `ema`, `lastPrint`, `bid`, `ask`, `spread`, `impliedCcl`, `crossCheck`, `status`, `source`, `marketOpen` |
| Market | `symbol`, `markPrice`, `indexPrice`, `fundingRate`, `maxLeverage`, `marketStatus`, `hip3` |
| Health | `status`, `oracle.status`, `breaker.frozen`, `breaker.thresholdPct`, `hip3.enabled`, `pusher.enabled` |
| Timestamps | Unix seconds a milliseconds, Unix milliseconds, ISO, ausencia y fecha inválida |
| Freshness | Selección de `timestamp` o `lastPrintAt`, cálculo seguro de `relativeTime` |
| Breaker | `frozen`, precio congelado, motivo, timestamp, ticks, valores ausentes y status no inventado |
| CCL | `reportedCcl`, `impliedCcl`, `cclSampled`, `cclDeviation`, alias `ccl` sólo con política explícita |
| Unidades | `thresholdPct`, `deviation`, `pctChange`, `fundingRate`, `spread` y `spreadPct` sin conversiones implícitas |
| Ausencias | Payload parcial sin history, volume, OI, HyperCore, HyperEVM o subobjetos operativos |
| Demo/real | Demo sin requests; modo real sin fallback silencioso a fixture |

Los tests deben seguir siendo unitarios o de normalización y no deben requerir que el backend esté ejecutándose. Cualquier test HTTP deberá pertenecer a una suite de integración separada y explícita, fuera del smoke test básico.

## 16. Criterios de aceptación de la implementación futura

La siguiente lista debe utilizarse cuando se autorice una fase de cambios de código. En esta entrega se marca el estado documental actual, no una ejecución de esos cambios.

| Criterio | Estado documental actual |
|---|---|
| El diseño visual se mantiene sin cambios | **Base existente aprobada; no se toca** |
| El HTML continúa siendo responsable de la estructura | **Cumplido en la base actual** |
| Los scripts hidratan el DOM existente | **Cumplido en la base actual, sujeto a conectar state real** |
| No se generan páginas completas con JavaScript | **Cumplido en la base actual** |
| Existe una API/data layer separada | **Parcial: existe normalización, falta client/endpoints activos** |
| No hay URLs backend duplicadas | **Pendiente de definir catálogo central** |
| `/health` está normalizado | **Parcial: sólo status/version/raw** |
| `/oracle/price/YPF` está normalizado | **Parcial: faltan campos y adaptaciones** |
| `/market/YPF-PERP` está normalizado | **Parcial: faltan symbol, hip3 y políticas de campos opcionales** |
| Timestamps correctamente normalizados | **Pendiente** |
| Circuit Breaker adaptado sin inventar información | **Pendiente** |
| CCL tratado explícitamente | **Pendiente de política y tests** |
| Campos inexistentes no se rellenan con demo | **Regla definida; debe cubrirse en modo real** |
| Demo mode funciona | **Cumplido en la base actual** |
| Real mode queda preparado | **Parcial: falta transporte, contrato y snapshot real** |
| Market consume modelo normalizado | **Parcial: todavía consulta algunas propiedades `raw` del snapshot** |
| Oracle consume modelo normalizado | **Parcial: todavía consulta `raw` para etapas del pipeline** |
| Infrastructure consume datos disponibles | **Parcial: aún deriva estados desde `raw`** |
| Blockchain sigue sin integración | **Cumplido y debe preservarse** |
| Wallet sigue sin integración | **Cumplido y debe preservarse** |
| Smoke tests cubren adaptaciones | **Pendiente** |
| `node --check` continúa pasando | **Validado en el commit base; repetir tras cambios futuros** |
| README describe arquitectura y limitaciones | **Parcial: requiere incorporar este contrato documental** |
| Backend no se modifica | **Regla vigente** |
| No se implementa deployment | **Regla vigente** |

## 17. Secuencia recomendada para una futura implementación

Cuando se autorice modificar código, el orden seguro es: primero confirmar el contrato real de los tres endpoints; luego implementar el catálogo de rutas y el cliente HTTP; después completar los normalizadores de Health, Oracle y Market; a continuación construir el snapshot compartido con loading y errores clasificados; posteriormente adaptar cada página para consumir sólo el modelo normalizado; y finalmente ampliar los smoke tests y ejecutar la validación visual.

Durante esa implementación se deberá revisar el diff para confirmar que no cambien HTML visual, CSS, responsive, iconos o textos que no sean estrictamente necesarios para mostrar datos reales. Blockchain, wallet, contratos, ABI, RPC, Web3, HyperEVM, HyperCore, VPS, Nginx, dominio, HTTPS y deployment permanecen fuera de esta fase.

## 18. Registro de esta entrega

Esta entrega añade únicamente este documento técnico. No se modificaron archivos de código, estilos, HTML, servidor, tests existentes, backend, contratos, blockchain ni wallet. Tampoco se ejecutaron requests contra el backend real. El commit deberá contener solamente la documentación de la Fase 2 y utilizar un mensaje descriptivo que refleje ese alcance.

## Referencias

1. [Especificación vigente de continuación de Fase 2 — `pasted_content_3.txt`](https://github.com/yumanyer/front-Austra/commit/9f192c6f)
2. [Commit base del refactor estructural `UUXX`](https://github.com/yumanyer/front-Austra/commit/9f192c6f)
3. [API/data layer actual](../js/api/index.js)
4. [Estado actual del frontend](../js/state.js)
5. [Datos mock actuales](../js/demo-data.js)
6. [Smoke test actual](../tests/smoke.mjs)
