# AustralFinance frontend

Frontend de producto para AustralFinance, construido exclusivamente con **HTML5, CSS3 y JavaScript Vanilla**. La interfaz organiza la experiencia en tres niveles: el mercado perpetuo `YPF-PERP`, el Oracle de precio y la infraestructura de publicación hacia HIP-3 / HyperCore y AssetOracle / HyperEVM.

La versión publicada actualmente está configurada como **DEMO DATA** para revisión visual. Todos los precios, estados, métricas y puntos del chart provienen de `js/demo-data.js` y están marcados como `SIMULATED` o `DEMO DATA` dentro de la interfaz.

## Ejecutar localmente

El repositorio no depende de un package manager ni de un framework. Para levantar un preview local con Node.js:

```bash
node server.cjs
```

Luego abrir `http://127.0.0.1:4173/`. Las rutas disponibles son `/`, `/markets`, `/oracle` e `/infrastructure`.

## Configurar el backend

La URL base del backend se configura antes de cargar `js/app.js` mediante `window.AUSTRAL_CONFIG` en `index.html`:

```html
<script>
  window.AUSTRAL_CONFIG = {
    API_URL: "https://api.example.com",
    USE_DEMO_DATA: false
  };
</script>
```

Con `USE_DEMO_DATA: true`, el cliente no realiza requests y usa el fixture explícito de `js/demo-data.js`. Para conectar el backend, cambiar la bandera a `false` y configurar `API_URL`.

El cliente centralizado consulta:

```text
GET /health
GET /oracle/price/YPF
GET /market/YPF-PERP
```

Las respuestas se normalizan en `js/api.js`. Los componentes nunca hacen `fetch()` directamente. Si un endpoint falla, la UI muestra el estado correspondiente (`Oracle unavailable`, `Market data unavailable`, `Backend unavailable`) y deja las métricas sin valor.

## Estructura

```text
index.html
css/styles.css
js/app.js
js/api.js
js/state.js
js/utils.js
js/components/common.js
js/components/chart.js
js/views/market.js
js/views/oracle.js
js/views/infrastructure.js
logo.png
server.cjs
```

El gráfico espera una serie real dentro de `history`, `series` o `candles` en la respuesta del endpoint de Market. En modo demo usa la serie explícita de `js/demo-data.js`; con el backend real y sin histórico, muestra `Historical data unavailable`.

## Verificación

La prueba de normalización se ejecuta con:

```bash
node tests/smoke.mjs
```

Además, todos los módulos se pueden validar con `node --check`.

## Datos no implementados

El repositorio auditado no incluye backend, contratos, ABI o endpoints de cadena. En la variante DEMO, Volume, Open Interest y estados blockchain se muestran con valores fixture sólo para hacer visible la composición, siempre dentro de un contexto `DEMO DATA`. Al desactivar el modo demo, la interfaz vuelve a mostrar `—`, `UNAVAILABLE` o `COMING SOON` hasta que exista una fuente real. La arquitectura permanece preparada para incorporar esos campos sin cambios visuales.
