# Austral Finance — Contracts

Capa blockchain del MVP de hackathon: el **oracle on-chain de YPF** y los **scripts del ciclo de despliegue HIP-3 / Kinetiq Launch**, desarrollados con [Foundry](https://book.getfoundry.sh/).

> **Estado:** prototipo de hackathon (testnet / rehearsal). Ningún componente de este directorio maneja capital real.

---

## Propósito

Según la arquitectura general del proyecto, este directorio es responsable únicamente de:

1. **`YPFOracle`** — el registro on-chain canónico del precio de referencia. Único contrato propio del proyecto.
2. **Scripts de ciclo Kinetiq** — `deployMarket → activateMarket → bondMarket → fund → launch`, ejecutables contra un mock propio (rehearsal) o, a futuro, contra el `EXFactory` real.
3. **Tooling** — tests, sincronización de ABI y scripts cross-platform.

Todo lo demás (matching, custodia, liquidación, orden de mercado) lo resuelve HyperCore/HIP-3 por diseño; no se construyen contratos artificiales.

## Pipeline completo

```text
Data912 API ──► Backend (normalización + EMA + circuit breaker) ──► Pusher ──► YPFOracle (HyperEVM)
                                                                                    │
Frontend ◄── API backend (/oracle/price/YPF, /market/YPF-PERP) ◄────────────────────────┘

La UI presenta el alias `YPF-USDC`; el backend y los scripts de contracts mantienen la identidad técnica `YPF-PERP` hasta una migración coordinada.
```

El circuit breaker y la EMA viven en el **backend** (fuera de horario de mercado se pushea la EMA). El contrato solo almacena el precio resultante y expone su frescura.

---

## Contratos

| Archivo | Descripción |
|---|---|
| `src/YPFOracle.sol` | Oracle push-style. Un pusher autorizado almacena precios por símbolo (`bytes32`) con precisión 1e6 (`42315000` = `$42.315`). Rechaza precio cero y timestamps futuros. Expone `isFresh(maxAge)` para que consumidores verifiquen frescura. |
| `src/interfaces/IHyperOracle.sol` | Interfaz mínima de lectura/escritura de precios. |
| `src/interfaces/IKinetiqLaunch.sol` | Interfaz tipada del ciclo de mercado. Al integrar el `EXFactory` real se reemplaza esta interfaz sin tocar los flujos. |
| `src/mocks/KinetiqLaunchMock.sol` | **Rehearsal only.** Máquina de estados `Deployed → Activated → Bonded → Funded → Live` con eventos por fase. Sustituto del protocolo Kinetiq Launch mientras no haya dirección de testnet disponible. |

### YPFOracle — API principal

```solidity
pushPrice(bytes32 symbol, uint256 price, uint64 timestamp)  // solo pusher; revierte si price==0 o ts futuro
latestPrice()                    // (price, timestamp) del activo primario (YPF)
latestPriceFor(bytes32 symbol)   // ídem para cualquier símbolo
isFresh(uint256 maxAge)          // ¿precio primario dentro de maxAge segundos?
isFreshFor(bytes32, uint256)     // ídem genérico
setPusher(address)               // solo owner; rota la wallet que pushea
```

Eventos: `PricePushed(symbol, price, timestamp)` y `PusherUpdated(old, new)` — el frontend puede suscribirse a ellos más adelante.

### KinetiqLaunchMock — fases válidas

```text
deployMarket ──► Deployed ──► activateMarket ──► Activated ──► bondMarket ──► Bonded
      ──► fund ──► Funded ──► launch ──► Live
```

Cualquier salto de fase revierte con `InvalidPhase`; re-deployar un mercado existente revierte con `MarketAlreadyExists`. Emite un evento por transición.

---

## Scripts de Foundry (`script/`)

| Script | Paso del ciclo |
|---|---|
| `DeployMarket.s.sol` | Deploya `YPFOracle` + llama `deployMarket`. Con `DEPLOY_MOCK=true` también deploya el mock de Kinetiq. |
| `ActivateMarket.s.sol` | `activateMarket` |
| `BondMarket.s.sol` | `bondMarket → fund → launch` (tres txs en secuencia) |
| `PushPrice.s.sol` | Push manual de un precio (`PUSH_PRICE_USD6`) — útil para pruebas puntuales; el pusher recurrente vivirá en el backend |
| `sync-abi.mjs` | Copia el ABI compilado desde `out/` hacia `abi/YPFOracle.json` (ver [Workflow de ABI](#workflow-de-abi)) |

---

## Guía rápida

### Requisitos

- [Foundry](https://book.getfoundry.sh/getting-started/installation): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
  - En Windows verificar que `%USERPROFILE%\.foundry\bin` esté en el `PATH`
- Node.js ≥ 18 (para el sync de ABI)

### Instalación

```bash
cd contracts
forge install foundry-rs/forge-std --no-git   # Makefile también lo hace automáticamente
cp .env.example .env                          # PowerShell: Copy-Item .env.example .env
```

### Build + tests

```bash
npm run build        # forge build + sincroniza abi/YPFOracle.json
npm run test         # forge test -vvv
forge test --match-test isFresh    # filtrar tests
```

Los tests de Foundry cubren validaciones del oracle (precio cero, timestamp futuro, overwrites, frescura con `vm.warp`, fuzzing) y el ciclo completo del mock (happy path, eventos y reverts fuera de orden). Ejecutar `npm run test` para obtener el conteo actual; no fijar un número histórico en esta documentación.

### Demo local end-to-end (Anvil)

```bash
# Terminal 1
anvil

# Terminal 2 — usar una cuenta de prueba de anvil
# PowerShell:
$env:DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
npm run deploy:local          # deploya mock + oracle y llama deployMarket
# completar ORACLE_CONTRACT_ADDRESS y KINETIQ_LAUNCH_ADDRESS en .env con las direcciones impresas
npm run activate
npm run bond                  # bond -> fund -> launch
$env:PUSH_PRICE_USD6=42315000
npm run push-price
```

Equivalente bash: exportar las variables con `export VAR=value`.

### Testnet (HyperEVM)

Red configurada: Hyperliquid Testnet, chain ID `998`, RPC `https://rpc.hyperliquid-testnet.xyz/evm`. Las direcciones y receipts de un deployment concreto deben verificarse contra el explorer/RPC, no inferirse desde el frontend.

```bash
# .env: DEPLOYER_PRIVATE_KEY, HYPERLIQUID_TESTNET_RPC ya tiene default
KINETIQ_LAUNCH_ADDRESS=<dirección del mock previamente deployado>
npm run deploy       # usa --rpc-url hyperliquid_testnet del foundry.toml
npm run activate
npm run bond
npm run push-price
```

Las direcciones deployadas pueden verificarse en <https://explorer.hyperliquid-testnet.xyz>.

---

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Uso |
|---|---|
| `HYPERLIQUID_TESTNET_RPC` | RPC de HyperEVM testnet (referenciado por el alias `hyperliquid_testnet` del `foundry.toml`) |
| `DEPLOYER_PRIVATE_KEY` | Wallet que deploya contratos y ejecuta el ciclo |
| `PUSHER_PRIVATE_KEY` | Wallet autorizada para `pushPrice` (fallback: deployer) |
| `ORACLE_CONTRACT_ADDRESS` | Dirección del `YPFOracle` deployado |
| `KINETIQ_LAUNCH_ADDRESS` | Mock rehearsal o `EXFactory` real cuando esté disponible |
| `DEPLOY_MOCK` | `true` → `DeployMarket` deploya también el mock |
| `MARKET_NAME` / `UNDERLYING` / `MAX_LEVERAGE` | Parámetros del mercado para backend/contracts (default `YPF-PERP` / `YPF` / `5`); la UI frontend muestra `YPF-USDC` |
| `PUSH_PRICE_USD6` | Precio para el push manual (1e6) |

⚠️ Nunca commitear `.env`. Está ignorado por `.gitignore`; si una clave real llegó a commitearse, rotarla inmediatamente.

## Workflow de ABI

El ABI que consumirá el backend vive en `abi/YPFOracle.json`. **No se edita a mano**: cada `npm run build` regenera desde los artefactos de Foundry vía `script/sync-abi.mjs`. Regeneración manual:

```bash
npm run abi:sync              # default YPFOracle
node script/sync-abi.mjs Otra # otro contrato
```

Motivación: si el contrato cambia (nuevas funciones, parámetros) y el ABI queda viejo, el pusher arma calldata incorrecto y las txs revierten en chain — error difícil de debuggear. Encadenar el sync al build elimina ese riesgo.

> Nota Windows: usar siempre el script Node, no redirects de consola (`>` en PowerShell produce UTF-16 con BOM que rompe `JSON.parse`).

## Integración con el backend

El backend ya contiene el pusher recurrente de HyperEVM y el publisher HIP-3, ambos protegidos por configuración. Para habilitar el pusher EVM:

1. Completar en `backend/.env`: `ORACLE_CONTRACT_ADDRESS` (impreso por `DeployMarket`) y `PUSHER_PRIVATE_KEY`.
2. Rotar el pusher on-chain si hace falta: `oracle.setPusher(<wallet backend>)` (transacción única del owner).
3. Mantener el ABI sincronizado en `contracts/abi/YPFOracle.json`.
4. El endpoint `/market/YPF-PERP` expone `lastPushTx`, `lastPushAt` y `marketStatus`.

El publisher HIP-3 sigue en `HIP3_DRY_RUN=true` por defecto y requiere `HIP3_ENABLED=true` más `HIP3_ORACLE_UPDATER_KEY` para enviar. La integración con el `EXFactory` real de Kinetiq continúa `Planned`; `KinetiqLaunchMock` sólo cubre rehearsal.

## Roadmap técnico

- Reemplazar `IKinetiqLaunch`/mock por la ABI real de `EXFactory` (Kinetiq Launch) cuando haya dirección de testnet: `deployMarket{value: opBond}(MarketParams)`, `activateMarket(marketId, tokenId, amount)`, `bondMarket(marketId)`.
- Integración SEDA Oracle Programs como fuente preferida (mantiene la misma interfaz de lectura).
- Extensión multi-activo (commodities Fase 3): el mapping del oracle ya es genérico por `bytes32`; solo agregan símbolos y fuentes.
