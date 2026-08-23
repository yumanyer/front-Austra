# AustralFinance frontend

Frontend de producto para AustralFinance, construido exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. La interfaz organiza la experiencia en tres niveles: el mercado perpetuo `YPF-PERP`, el Oracle de precio y la infraestructura de publicación hacia HIP-3 / HyperCore y AssetOracle / HyperEVM.

La versión publicada actualmente está configurada como **DEMO DATA** para revisión visual. Todos los precios, estados, métricas y puntos del chart provienen de `js/demo-data.js` y están marcados como `DEMO DATA` dentro de la interfaz.

## Ejecutar localmente

El repositorio no depende de un package manager ni de un framework. Para levantar un preview local con Node.js:

```bash
node server.cjs
```

Luego abrir `http://127.0.0.1:4173/`. La portada muestra Market y las interfaces tienen archivos HTML independientes en `/markets/market.html`, `/oracle/oracle.html` e `/infra/infrastructure.html`.

La navegación se realiza mediante enlaces HTML normales; no existe un router SPA.

## Estructura

```text
index.html
markets/
├── market.html
├── market.js
└── markets.css
oracle/
├── oracle.html
├── oracle.js
└── oracle.css
infra/
├── infrastructure.html
├── infrastructure.js
└── infra.css
css/
├── root.css
└── media.css
js/
├── api/
│   └── index.js
├── blockchain/
│   ├── README.md
│   └── (punto de integración futuro)
├── wallet/
│   ├── README.md
│   └── (punto de integración futuro)
├── components/
│   ├── common.js
│   └── chart.js
├── utils/
│   └── format.js
├── app.js
├── demo-data.js
└── state.js
tests/
└── smoke.mjs
logo.png
server.cjs
```

Los documentos HTML contienen la estructura visual real de cada interfaz. Los scripts de página actualizan elementos existentes, gestionan interacciones y delegan el SVG del chart al componente reutilizable `js/components/chart.js`.

## Datos mock y puntos de integración

El frontend conserva el fixture explícito de `js/demo-data.js`. `js/api/index.js` mantiene únicamente las funciones de normalización; no realiza requests, no agrega endpoints y no conecta Data912, backend, blockchain, RPC, WDK, wallet o transacciones en esta fase. Las carpetas `js/api/`, `js/blockchain/` y `js/wallet/` quedan preparadas para una integración posterior.

## Verificación

La prueba de normalización se ejecuta con:

```bash
node tests/smoke.mjs
```

Además, todos los módulos se pueden validar con `node --check`. El servidor local sirve los archivos estáticos directamente y no transforma las rutas en `index.html`.
