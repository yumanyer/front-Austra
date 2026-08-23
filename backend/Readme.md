# Austral Finance— Backend

## Descripción general

El backend es un servicio **Fastify** (Node.js, ESM) que actúa como el componente central de precio y orquestación para el proyecto Austral Finance. Su responsabilidad principal es:

1. **Obtener precios** de Data912 para el activo pilot (`YPF`, ADR + ticker local BYMA `YPFD`).
2. **Normalizar y validar** los datos: sanity del book, cross-check vs. el CCL de referencia, EMA (Media Móvil Exponencial), circuit breaker.
3. **Servir APIs** públicas que el frontend consume (`/health`, `/oracle/price/:symbol`, `/market/:symbol`).
4. **Publicar el precio a HyperCore** vía HIP-3 (`perpDeploy.setOracle`) — integración preparada, deshabilitada por defecto y en dry-run por defecto.
5. **Espejar el precio on-chain en HyperEVM** mediante `YPFOracle` cuando se configuren address y clave del pusher — es un mirror auditable y no el feed que lee HyperCore.

---

## Arquitectura

```
src/
├── index.js            # Punto de entrada: valida config, registra routes, arranca oracle + pusher + publisher
├── types.js             # JSDoc typedefs (Data912Tick, NormalizedTick, OraclePriceResponse, MarketResponse)
├── config.js             # Fuente única de configuración: lee env vars, valida, congela el objeto (deepFreeze)
├── util/
│   └── num.js            # round6() — redondeo a 6 decimales usado en todo el pipeline
├── oracle/
│   ├── index.js          # Polling loop: fetch → normalize → circuit breaker → EMA → estado publicado
│   ├── fetcher.js         # fetchAdrTick / fetchLocalTick / fetchReferenceCcl / fetchHistoricalCloses (Data912)
│   ├── normalizer.js      # Valida book (bookStale), calcula el cross-check CCL implícito vs. reportado
│   ├── ema.js             # EMA con alpha configurable, seed desde closes históricos
│   └── circuitBreaker.js  # Congela el precio si la desviación o el cross-check de CCL disparan el umbral
├── pusher/
│   └── hipPusher.js       # Mirror EVM: firma pushPrice(symbol, price6, ts) en YPFOracle (viem)
├── hip3/
│   ├── infoClient.js      # Cliente POST a /info de Hyperliquid, con reintentos/backoff
│   ├── preflight.js       # Checklist read-only: key firmante, stake, dex libre, colateral, auction
│   ├── deployer.js        # registerAsset2 — crea el mercado HIP-3 (dry-run por defecto, --send para firmar)
│   └── publisher.js       # Loop ~3s: perpDeploy.setOracle — el feed real que lee HyperCore
└── routes/
    ├── health.routes.js   # GET /health
    ├── oracle.routes.js   # GET /oracle/price/:symbol
    └── market.routes.js   # GET /market/:symbol

test/                      # node --test — config, ema, circuitBreaker, normalizer, oracle, hip3, hip3-deployer
```

---

## Flujo de polling (`oracle/index.js`)

1. `fetchAll(symbol, localSymbol)` trae en paralelo el tick ADR (USD), el tick local BYMA (ARS) y el CCL de referencia. Un fallo en el leg local o el CCL no bloquea el precio ADR — el cross-check simplemente queda `unavailable`.
2. `normalize(adr, local, ccl)` valida el book (`bookStale` si el spread es demasiado ancho fuera de horario) y calcula `impliedCcl = localArs * adrRatio / adrUsd` contra el CCL reportado.
3. `evaluate(price, emaPrevia, crossCheck)` (circuit breaker) congela el precio si la desviación contra la EMA previa supera el umbral, o si el cross-check de CCL es `suspect`. Se libera tras `ORACLE_BREAKER_RELEASE_TICKS` ticks consecutivos dentro de banda.
4. Si el veredicto es `valid`, recién ahí se actualiza la EMA — un precio rechazado nunca mueve la referencia contra la que se lo juzgó.
5. Fuera del horario NYSE (9:30–16:00 America/New_York) el precio publicado pasa a ser la EMA (`source: 'ema_fallback'`) o, si `ORACLE_SIMULATED_WALK=true`, una caminata sintética mean-reverting (`source: 'simulated'`).
6. Si el fetch falla y no hay baseline, el resultado es `null` y las rutas responden 503.

El resultado se cachea en memoria (`latestPrice`) y lo sirven `/oracle/price/:symbol` y `/market/:symbol`.

---

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del proceso + `oracle` (oracleHealth), `breaker` (circuit breaker), `hip3` (publisher a HyperCore), `pusher` (mirror EVM) |
| `GET` | `/oracle/price/:symbol` | `OraclePriceResponse` — price, ema, lastPrint, bid/ask/spread, cross-check CCL, status, source, marketOpen. 404 si el símbolo no es el configurado, 503 si el oracle no arrancó |
| `GET` | `/market/:symbol` | `MarketResponse` para el perp `{ORACLE_SYMBOL}-PERP` — markPrice, indexPrice, fundingRate (cálculo acotado mientras el venue está abierto), maxLeverage (de la margin table), marketStatus (`live`/`rehearsal`/`offline`), estado de HIP-3 y del pusher. La UI puede mostrar el alias `YPF-USDC`, pero la ruta técnica actual permanece `YPF-PERP`. |

---

## Configuración (`.env`)

Todo pasa por `src/config.js`: valores inválidos no tiran la app al importar el módulo, caen al default y se acumulan en `configErrors`, que `index.js` reporta antes de rehusarse a arrancar. Los `.env` se cargan con el flag nativo de Node `--env-file-if-exists` (raíz primero, después `backend/`, así que el local gana; variables reales de shell/CI ganan a ambos) — no hay dependencia de `dotenv`. En producción, Nginx publica `/api/*` y hace proxy al listener privado del backend en `127.0.0.1:3000`; no se expone el puerto del backend directamente.

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Dirección de escucha; loopback por defecto para mantener el backend privado detrás de Nginx |
| `PORT` | `3000` | Puerto del servidor |
| `DATA912_BASE_URL` | `https://data912.com` | Base de la API Data912 (pública, sin auth) |
| `DATA912_TIMEOUT_MS` | `5000` | Timeout por request |
| `ORACLE_SYMBOL` | `YPF` | Ticker ADR (feed US) |
| `ORACLE_LOCAL_SYMBOL` | `YPFD` | Ticker local BYMA, usado solo para el cross-check |
| `ORACLE_POLL_INTERVAL_MS` | `30000` | Intervalo de polling (Data912 cachea ~30s) |
| `ORACLE_EMA_ALPHA` | `0.2` | Factor de suavizado EMA, (0, 1] |
| `ORACLE_CIRCUIT_BREAKER_PCT` | `0.10` | Desviación máx. `|price - ema| / ema` antes de congelar |
| `ORACLE_BREAKER_RELEASE_TICKS` | `3` | Ticks consecutivos en banda para liberar el freeze |
| `ORACLE_ADR_RATIO` | `10` | Acciones locales por ADR |
| `ORACLE_SPREAD_MAX_PCT` | `0.02` | Spread relativo a partir del cual el book se marca `bookStale` |
| `ORACLE_CCL_MAX_DEVIATION_PCT` | `0.03` | Tolerancia CCL implícito vs. reportado |
| `ORACLE_CCL_REFERENCE_COUNT` | `10` | Cantidad de pares líquidos que arma la mediana de referencia |
| `ORACLE_STALE_THRESHOLD_S` | `60` | Segundos sin fetch OK antes de `status=stale` |
| `ORACLE_SEED_CLOSES` | `5` | Closes históricos usados para sembrar la EMA al boot |
| `ORACLE_SIMULATED_WALK` | `false` | `true` = caminata sintética fuera de horario (`source: 'simulated'`) |
| `HIP3_ENABLED` | `false` | Habilita el publisher a HyperCore |
| `HIP3_DRY_RUN` | `true` | `true` = arma y loguea la acción, nunca firma ni envía |
| `HIP3_TESTNET` | `true` | Testnet vs. mainnet de Hyperliquid |
| `HIP3_DEX` | `arg` | 2-4 letras minúsculas — nombre del dex HIP-3 |
| `HIP3_COIN` | `YPF` | Coin dentro del dex |
| `HIP3_SZ_DECIMALS` | `2` | Decimales de tamaño del perp |
| `HIP3_FULL_NAME` | `Austral Finance Argentine Markets` | Nombre completo del dex (solo en el primer asset) |
| `HIP3_COLLATERAL_TOKEN` | `0` | Índice del token spot de colateral (USDC) |
| `HIP3_MARGIN_TABLE_ID` | `5` | Ids < 50 son built-in de HyperCore: el id ES el leverage máximo |
| `HIP3_MARGIN_MODE` | `strictIsolated` | `strictIsolated` \| `noCross` \| `normal` |
| `HIP3_MIN_STAKE_HYPE` | `100` | Piso de stake inferido (no documentado), informativo, no bloquea el deploy |
| `HIP3_PUBLISH_INTERVAL_MS` | `3000` | Cadencia de `setOracle` (mín. 2500ms; el mark queda stale a los 10s de silencio) |
| `HIP3_ORACLE_UPDATER_KEY` | — | Clave del firmante HIP-3, requerida para publicar en modo no-dry-run |
| `ORACLE_CONTRACT_ADDRESS` | — | Contrato mirror en HyperEVM — junto con `PUSHER_PRIVATE_KEY` habilita el pusher |
| `PUSHER_PRIVATE_KEY` | — | Clave que firma `pushPrice` en el contrato mirror |
| `PUSH_INTERVAL_MS` | `30000` | Cadencia del pusher EVM |
| `HYPERLIQUID_TESTNET_RPC` | `https://rpc.hyperliquid-testnet.xyz/evm` | RPC usado por el pusher EVM |
| `HYPERLIQUID_CHAIN_ID` | `998` | Chain id de Hyperliquid testnet |

```
                 ┌─────────────────┐
                 │     Data912     │
                 │  ADR + local +  │
                 │   CCL de ref.   │
                 └────────┬────────┘
                          │ cada ORACLE_POLL_INTERVAL_MS (30s)
                          ▼
                 ┌─────────────────┐
                 │     Oracle      │
                 │ normalize       │
                 │ circuit breaker │
                 │ EMA             │
                 └────────┬────────┘
                          │ precio publicado (post-breaker)
             ┌────────────┴────────────┐
             │ cada HIP3_PUBLISH_       │ cada PUSH_INTERVAL_MS (30s)
             │ INTERVAL_MS (3s)         │
             ▼                          ▼
   ┌─────────────────────┐    ┌─────────────────────┐
   │  HIP-3 publisher     │    │   Pusher EVM          │
   │ perpDeploy.setOracle │    │ pushPrice() en        │
   │ → feed real HyperCore│    │ YPFOracle (mirror     │
   │                       │    │ auditable, HyperCore  │
   │                       │    │ NO lo lee)             │
   └─────────────────────┘    └─────────────────────┘
```

---

## Scripts disponibles

El entrypoint real es `src/index.js`. El comando de producción definido en `package.json` es `npm start`; `npm run dev` agrega `--watch` para desarrollo. Para PM2 se utiliza el archivo [`../deploy/pm2/ecosystem.config.cjs`](../deploy/pm2/ecosystem.config.cjs), con el proceso `austral-backend`.

```bash
# Desde la carpeta backend/
npm run dev            # Inicia con hot-reload (node --watch)
npm start               # Inicia el servidor
npm test                # Ejecuta tests (node --test test/*.test.js)
npm run hip3:preflight   # Checklist read-only antes de deployar el mercado HIP-3
npm run hip3:deploy      # Arma (y, con --send, firma) el registerAsset2 del mercado HIP-3
```

---

## Pusher EVM (`pusher/hipPusher.js`)

- Corre cada `PUSH_INTERVAL_MS` (default 30s), solo si `ORACLE_CONTRACT_ADDRESS` y `PUSHER_PRIVATE_KEY` están configurados, con guarda `inFlight` contra ticks solapados (dos `writeContract` en vuelo pedirían el mismo nonce).
- Toma el precio actual vía `getPrice()` y firma `pushPrice(keccak256(symbol), price * 1e6, timestamp)` en el contrato con `viem`.
- Publica igual cuando el precio está `frozen` o es `simulated` — es exactamente el valor que sostiene el breaker, y `/market` reporta `simulated: true` junto a él. Solo un precio no finito o `status: 'error'` frena el push.
- Es un **mirror auditable en HyperEVM mediante `YPFOracle`**, no el feed que consume HyperCore — ese rol lo cumple el publisher HIP-3 (`hip3/publisher.js`).

## Publisher HIP-3 (`hip3/publisher.js`)

- Corre cada `HIP3_PUBLISH_INTERVAL_MS` (default 3s) — cadencia independiente del polling de datos, porque HyperCore espera un `setOracle` aunque el precio no haya cambiado y descarta el mark tras 10s de silencio. Guarda `inFlight` contra ticks solapados.
- En `HIP3_DRY_RUN=true` (default) arma la acción `perpDeploy.setOracle` y solo la loguea. En modo real firma con `HIP3_ORACLE_UPDATER_KEY` vía `@nktkas/hyperliquid`.
- `oraclePxs` lleva el precio publicado (post-breaker); `markPxs` lleva el último print sin tocar — se distinguen a propósito mientras el breaker está congelado.
- Un precio `stale` (feed caído más de `ORACLE_STALE_THRESHOLD_S`) **no se publica**: HyperCore ya cae a su mark local a los 10s de silencio, que es el failsafe correcto; seguir firmando el precio viejo lo desactivaría. Un precio `frozen` (breaker) sí sigue publicándose — es el valor que el breaker sostiene a propósito.
- El deploy del mercado (`hip3/deployer.js`) y el checklist previo (`hip3/preflight.js`) son scripts de un solo uso, no procesos long-running.

---

## Contrato inteligente (`contracts/src/YPFOracle.sol`)

- `YPFOracle` es el contrato push-style propio del proyecto. El constructor recibe el `pusher` inicial y establece `owner = msg.sender`.
- `latestPrice()` lee el símbolo canónico `YPF`; `latestPriceFor(bytes32 symbol)` permite consultar cualquier símbolo almacenado.
- `pushPrice(bytes32 symbol, uint256 price, uint64 timestamp)` sólo puede ejecutarlo el pusher autorizado, exige precio positivo y rechaza timestamps futuros.
- `setPusher(address)` sólo puede ejecutarlo el owner. Las funciones de escritura emiten `PricePushed` y `PusherUpdated`.
- El precio se almacena con precisión 1e6 junto con un timestamp `uint64`; `isFresh` e `isFreshFor` permiten comprobar frescura relativa al tiempo actual.

El frontend no llama estas funciones ni usa ABI: sólo muestra metadata y, en Infrastructure, verifica bytecode y receipts mediante JSON-RPC read-only.

---

## Estado actual

- **Activo piloto**: `YPF` (ADR) / `YPFD` (BYMA), identidad operativa backend `{ORACLE_SYMBOL}-PERP` en el dex HIP-3 `arg`; la UI frontend presenta el alias `YPF-USDC`.
- **Fuente de precio**: Data912 (ADR + local + CCL de referencia), con fallback a EMA o caminata simulada fuera de horario según configuración.
- **Oráculo**: fetch → normalize (cross-check CCL, sanity de book) → circuit breaker → EMA, con último resultado cacheado en memoria.
- **HyperCore**: publisher HIP-3 (`perpDeploy.setOracle`) — deshabilitado por defecto (`HIP3_ENABLED=false`), dry-run por defecto (`HIP3_DRY_RUN=true`); sin prueba de publicación real en el estado predeterminado.
- **HyperEVM**: mirror auditable vía `YPFOracle`, deshabilitado hasta configurar `ORACLE_CONTRACT_ADDRESS` + `PUSHER_PRIVATE_KEY`.
- **Frontend**: consume `/market/YPF-PERP` y `/oracle/price/YPF`; Infrastructure consulta además el RPC read-only configurado para verificar deployments, sin firmar.
- **Tests**: 58 casos (`node --test` en la validación actual) cubriendo config, EMA, circuit breaker, normalizer, oracle end-to-end y HIP-3 (publisher/deployer).

## Deployment VPS

La plantilla Nginx y el procedimiento PM2 se encuentran en [`../deploy/README.md`](../deploy/README.md). La configuración está preparada, pero la instalación real en una VPS, la IP pública, las reglas OCI, el dominio, HTTPS y los backups siguen `PENDING` hasta verificarse en la instancia.

## Próximos pasos / TODOs

- [ ] Soportar múltiples símbolos simultáneos en los endpoints (hoy hardcodeado a `ORACLE_SYMBOL`).
- [x] Usar `YPFOracle` como nombre del contrato mirror y del ABI sincronizado.
- [x] Calcular un funding indicativo acotado desde la prima mark/index mientras el mercado está abierto.
- [ ] Sustituir el funding indicativo por la fuente oficial del venue cuando el backend la exponga.
- [ ] Métricas/observabilidad (Prometheus u otro) más allá de `/health`.
- [ ] Deploy del mercado HIP-3 real (`npm run hip3:deploy -- --send`) una vez cubierto el piso de stake.
- [ ] Rotar `PUSHER_PRIVATE_KEY`/`HIP3_ORACLE_UPDATER_KEY` y separar la key del deployer de la del updater recurrente (ver B2 de la auditoría).
