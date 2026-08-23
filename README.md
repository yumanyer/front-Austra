# AustralFinance

AustralFinance es un prototipo de hackathon para mostrar infraestructura de precios y un mercado de activos argentinos. El repositorio está dividido en tres áreas independientes: [`frontend/`](frontend/), [`backend/`](backend/) y [`contracts/`](contracts/).

> **Estado actual:** el proyecto funciona como prototipo de testnet/rehearsal. El frontend, el backend y los contratos tienen responsabilidades separadas. HIP-3 y el pusher EVM están preparados en el código, pero permanecen protegidos por configuración; la wallet, la firma desde el frontend y las transacciones iniciadas desde la UI no están implementadas.

## Componentes principales

| Área | Implementado realmente | Estado o límite actual |
|---|---|---|
| `frontend/` | Interfaz HTML/CSS/JavaScript Vanilla, Data Layer HTTP, estado compartido, normalización y vista Infrastructure read-only | Market, Oracle e Infrastructure consumen datos disponibles; Volume, Open Interest e histórico son presentación visual explícita mientras el backend no los expone |
| `backend/` | Servicio Fastify ESM, polling Data912, normalización, cross-check CCL, EMA, circuit breaker, endpoints HTTP, pusher EVM y publisher HIP-3 | HIP-3 está `HIP3_ENABLED=false` y `HIP3_DRY_RUN=true` por defecto; el pusher EVM sólo se habilita con address y clave |
| `contracts/` | `YPFOracle`, `KinetiqLaunchMock`, scripts Foundry, tests y sincronización del ABI | `KinetiqLaunchMock` es rehearsal; la integración con el `EXFactory` real de Kinetiq continúa `Planned` |

La nomenclatura visible y la identidad técnica no son idénticas. La interfaz muestra **`YPF-USDC`** como símbolo de mercado solicitado para el producto. El backend y los scripts de contracts todavía validan la ruta técnica **`/market/YPF-PERP`** y el nombre operativo `{ORACLE_SYMBOL}-PERP`; HIP-3 identifica el activo como `arg:YPF`. Cambiar el alias visible no implica haber migrado el backend o el mercado on-chain.

## Arquitectura real

El flujo que existe en el código es el siguiente:

```text
Data912 REST
    │
    ├── ADR YPF en USD
    ├── YPFD en BYMA/ARS
    └── CCL de referencia
    │
    ▼
Backend Oracle en memoria
    fetchAll → normalize → CCL cross-check → circuit breaker → EMA
    │
    ├── GET /health
    ├── GET /oracle/price/YPF
    └── GET /market/YPF-PERP
    │
    ├── Pusher EVM opcional ──pushPrice──► YPFOracle en HyperEVM
    └── Publisher HIP-3 preparado ──setOracle──► HyperCore

Frontend
    │
    ├── Data Layer HTTP ───────────────► Backend
    └── Infrastructure RPC read-only ──► Hyperliquid Testnet EVM RPC

Wallet
    └── Botón visual de conexión; conexión, firma y envío: Not implemented
```

### Qué ocurre off-chain

El backend obtiene los datos de Data912, valida el book, calcula el cross-check entre el precio local y el ADR mediante el CCL, evalúa el circuit breaker y actualiza la EMA sólo cuando el tick es aceptado. El último resultado se guarda en memoria. Fuera del horario de mercado, el precio publicado puede ser la EMA (`ema_fallback`) o una caminata sintética si se activa `ORACLE_SIMULATED_WALK=true`. Si no existe un baseline usable, las rutas Oracle y Market responden `503`.

El endpoint de Market construye `markPrice` a partir del precio publicado por el Oracle e `indexPrice` a partir del último print. `fundingRate` es un cálculo indicativo acotado por la prima mark/index durante el horario de mercado y vale cero fuera de horario; no es todavía una tasa oficial del venue. `maxLeverage` se resuelve desde la margin table configurada.

### Qué ocurre on-chain

Cuando se configuran `ORACLE_CONTRACT_ADDRESS` y `PUSHER_PRIVATE_KEY`, el backend puede firmar `pushPrice` en `YPFOracle` usando el ABI sincronizado. Ese contrato es un mirror auditable en HyperEVM y no es el feed que consume HyperCore. El publisher HIP-3 separado prepara o envía `perpDeploy.setOracle`; requiere `HIP3_ENABLED=true`, una clave `HIP3_ORACLE_UPDATER_KEY` y abandonar explícitamente el dry-run.

El contrato `KinetiqLaunchMock` sólo reproduce el ciclo `deployMarket → activateMarket → bondMarket → fund → launch` y sus fases `Deployed → Activated → Bonded → Funded → Live`. No implementa matching, custodia, liquidación ni un mercado productivo.

## Frontend

El frontend es estático y no utiliza frameworks ni dependencias de frontend. Sus rutas principales son:

| Ruta | Vista |
|---|---|
| `/` | Market |
| `/markets/market.html` | Market |
| `/oracle/oracle.html` | Oracle |
| `/infra/infrastructure.html` | Infrastructure |

La Data Layer centraliza `API_URL`, timeouts, modo demo y el RPC de Infrastructure. En producción, `frontend/js/env.js` define `API_URL: "/api"`; Nginx proxifica ese prefijo hacia las rutas backend reales sin prefijo. En modo real solicita en paralelo `/health`, `/oracle/price/YPF` y `/market/YPF-PERP`; conserva errores por recurso y no convierte automáticamente un error en datos demo. El modo demo sólo se activa explícitamente con `USE_DEMO_DATA=true`.

Market muestra Price, EMA, Data source, Mark Price, Index Price, Funding Rate y Max Leverage desde el modelo real o el fixture seleccionado. `frontend/js/presentation-data.js` contiene exclusivamente el valor visual de Volume, Open Interest y las series 1H/1D/1W porque el contrato HTTP actual no garantiza esos campos.

Infrastructure tiene dos capas distintas. El mapa de Architecture es conceptual; las tarjetas **On-chain state** y **Deployments** usan metadata de deployment y consultas JSON-RPC read-only. Sólo muestra `CONNECTED`, `DEPLOYED` o `SUCCESS` cuando la respuesta correspondiente lo sustenta; `UNAVAILABLE`, `ERROR` y `NOT DEPLOYED` se conservan como estados honestos. No usa ABI, wallet, signing ni llamadas de escritura.

Para iniciar el frontend:

```bash
cd frontend
node server.cjs
```

Abrir <http://127.0.0.1:4173/>.

## Backend

El backend usa Node.js ESM, Fastify, CORS y rate limiting. Desde `backend/`:

```bash
npm ci
npm test
npm run dev
```

La configuración se carga desde variables de entorno, un `.env` raíz opcional y un `.env` local opcional. Las variables de shell/CI tienen prioridad. Los defaults más relevantes son:

| Variable | Default | Uso |
|---|---:|---|
| `HOST` | `127.0.0.1` | Listener privado detrás de Nginx |
| `PORT` | `3000` | Puerto HTTP |
| `DATA912_BASE_URL` | `https://data912.com` | Fuente externa de precios |
| `ORACLE_SYMBOL` | `YPF` | ADR que alimenta el Oracle |
| `ORACLE_LOCAL_SYMBOL` | `YPFD` | Ticker BYMA para cross-check |
| `HIP3_ENABLED` | `false` | Habilita publisher HyperCore |
| `HIP3_DRY_RUN` | `true` | Evita firmar o enviar por defecto |
| `HIP3_DEX` | `arg` | DEX HIP-3 |
| `HIP3_COIN` | `YPF` | Coin del DEX |
| `HIP3_MARGIN_TABLE_ID` | `5` | Tabla cuyo límite built-in equivale a 5x |
| `HYPERLIQUID_TESTNET_RPC` | `https://rpc.hyperliquid-testnet.xyz/evm` | RPC del pusher EVM |
| `HYPERLIQUID_CHAIN_ID` | `998` | Chain ID esperado |

### API HTTP real

| Método | Ruta | Disponibilidad y contenido |
|---|---|---|
| `GET` | `/health` | Estado del proceso, Oracle, breaker, publisher HIP-3 y pusher EVM |
| `GET` | `/oracle/price/YPF` | Precio publicado, EMA, último print, book, CCL, breaker, source, freshness y status |
| `GET` | `/market/YPF-PERP` | Mark/index, funding indicativo, leverage, status de mercado, señales HIP-3 y pusher |

`/oracle/price/:symbol` responde `404` si el símbolo no coincide con `ORACLE_SYMBOL` y `503` si el Oracle todavía no tiene resultado. `/market/:symbol` responde `404` si no coincide con `{ORACLE_SYMBOL}-PERP` y `503` si el Oracle aún no está inicializado.

El backend no expone todavía `volume24h`, `openInterest`, histórico, bytecode de contratos o metadata de deployments dentro de esos payloads.

## Contracts

Los contratos usan Foundry y Solidity `0.8.26`. Desde `contracts/`:

```bash
forge install foundry-rs/forge-std --no-git
npm run build
npm run test
```

| Contrato | Responsabilidad | Estado |
|---|---|---|
| `YPFOracle` | Almacena precio por símbolo, timestamp y pusher autorizado; expone `latestPrice`, `latestPriceFor`, `isFresh`, `isFreshFor` y `setPusher` | Implemented |
| `KinetiqLaunchMock` | Simula fases del ciclo de lanzamiento y emite eventos por transición | Rehearsal only |
| `IKinetiqLaunch` | Interfaz mínima del mock y placeholder tipado para sustituirla por el ABI real | Planned replacement for real EXFactory |

`DeployMarket.s.sol` despliega `YPFOracle`, opcionalmente `KinetiqLaunchMock` con `DEPLOY_MOCK=true`, y ejecuta `deployMarket`. Los scripts de activación, bonding y push de precio son operaciones de deployment/operación separadas. `contracts/abi/YPFOracle.json` se genera desde los artefactos de Foundry mediante `npm run build` o `npm run abi:sync`; no se edita manualmente.

La red de testnet configurada en `foundry.toml` es Hyperliquid Testnet, con alias `hyperliquid_testnet`, RPC `https://rpc.hyperliquid-testnet.xyz/evm` y chain ID `998`. Las direcciones concretas de deployment deben leerse desde los artefactos, variables o explorer correspondiente; no se infieren de la UI.

## Deployment VPS

La configuración versionada para Ubuntu 24.04 + Nginx + PM2 se encuentra en [`deploy/README.md`](deploy/README.md), [`deploy/nginx/austral.conf`](deploy/nginx/austral.conf) y [`deploy/pm2/ecosystem.config.cjs`](deploy/pm2/ecosystem.config.cjs). El backend real inicia en `backend/src/index.js` mediante `npm start`, escucha en `127.0.0.1:3000` por defecto y se publica externamente sólo a través de `/api/*`.

El código de deployment está preparado localmente; la instalación efectiva en una VPS, la IP pública, VCN/subnet, Security List, firewall, dominio, HTTPS y backups siguen `PENDING` hasta validarse en la instancia. No se ejecutaron cambios remotos, no se modificaron reglas de OCI y no se subieron secretos.

## Estados implementados y pendientes

| Capacidad | Estado |
|---|---|
| Frontend Vanilla, Market, Oracle e Infrastructure | Implemented |
| Data Layer HTTP, normalización y errores parciales | Implemented |
| Oracle Data912, CCL, EMA y circuit breaker | Implemented |
| Mirror EVM mediante `YPFOracle` | Implemented in backend, opt-in por configuración |
| Publisher HIP-3 | Implemented as dry-run/opt-in; publicación real depende de credenciales y venue |
| Integración con EXFactory real de Kinetiq | Planned |
| Métricas oficiales de funding, Volume, Open Interest e histórico backend | Pending |
| Lecturas ABI desde frontend | Not implemented |
| Wallet, firma y transacciones desde frontend | Not implemented |
| HyperCore `ACTIVE` verificable desde el frontend | Not available sin fuente inequívoca |

## README por área

- [Documentación detallada del frontend](frontend/README.md)
- [Documentación del backend](backend/Readme.md)
- [Documentación de contracts](contracts/README.md)
- [Notas de la Data Layer](frontend/docs/fase-2-data-layer.md)

La documentación debe distinguir siempre entre funcionalidades implementadas, integraciones opt-in, rehearsal, planned, pending y not implemented. El código es la fuente de verdad; los README no deben presentar estados futuros como activos.
