# AustralFinance frontend

Frontend visual de AustralFinance construido exclusivamente con **HTML semántico, CSS organizado y JavaScript Vanilla modular**. Esta etapa se limita a completar la experiencia visual de Markets, Oracle e Infrastructure con datos mock aislados. No hay conexiones con backend, API, blockchain, contratos, RPC, Data912, WDK, wallet ni transacciones.

> **Fase 1:** estructura y comportamiento visual. Los valores mock existen únicamente para que las interfaces puedan revisarse y se eliminan desde un único archivo en la siguiente fase.

## Ejecutar localmente

El proyecto no usa framework ni bundler. Desde esta carpeta se puede levantar el preview estático con Node.js:

```bash
node server.cjs
```

Luego abrir [http://127.0.0.1:4173/](http://127.0.0.1:4173/). El servidor entrega documentos HTML reales y también ofrece atajos sin extensión:

| Interfaz | Documento HTML | Atajo |
| --- | --- | --- |
| Inicio | `index.html` | `/` |
| Markets | `markets/market.html` | `/markets` |
| Oracle | `oracle/oracle.html` | `/oracle` |
| Infrastructure | `infra/infrastructure.html` | `/infra` |

La navegación utiliza enlaces HTML normales. No existe router SPA ni fallback que reemplace una página completa desde JavaScript.

## Arquitectura frontend

Cada interfaz contiene su propia estructura semántica: encabezado, navegación, contenido principal, secciones, artículos, enlaces y pie de página. Los módulos JavaScript sólo enlazan eventos y actualizan valores o atributos de nodos que ya existen en el HTML.

| Área | Ubicación | Responsabilidad |
| --- | --- | --- |
| Inicio | `index.html` | Presentación del preview y enlaces a las tres interfaces. |
| Markets | `markets/market.html` + `markets/market.js` | Estructura del mercado, gráfico y métricas visuales. |
| Oracle | `oracle/oracle.html` + `oracle/oracle.js` | Pipeline, métricas y circuito de protección visual. |
| Infrastructure | `infra/infrastructure.html` + `infra/infrastructure.js` | Diagrama, flujo y tarjetas de componentes. |
| Estilos compartidos | `css/styles.css` | Tokens, componentes, layout y breakpoints responsive. |
| Estilos de inicio | `home/home.css` | Hero, tarjetas de interfaces y principios visuales. |
| Comportamiento común | `js/app.js` | Menú móvil y marcado de navegación activa. |
| Mock data | `js/mock-data.js` | Única fuente de valores visuales temporales. |
| Utilidades | `js/page-data.js`, `js/utils.js` | Formateo y actualización de nodos existentes. |
| Gráfico | `js/components/chart.js` | Actualiza el SVG estático del gráfico sin generar una página. |
| Preview | `server.cjs` | Servidor estático local con rutas explícitas y protección de paths. |

La regla de separación es deliberada: **HTML = estructura**, **CSS = presentación**, **JavaScript = interacción** y **`mock-data.js` = valores temporales**. En esta fase no se agregan contratos de datos externos ni funciones de integración.

## Datos mock

Todo valor visual temporal vive en `js/mock-data.js`, exportado como `MOCK_SNAPSHOT`. Las páginas importan ese fixture a través de `loadMockSnapshot()` y no realizan solicitudes de red. Para eliminar los datos en la siguiente fase basta con reemplazar ese límite por la fuente acordada, sin reconstruir la estructura de las interfaces.

## Verificación

La prueba frontend-only valida la existencia de documentos reales, navegación modular, datos mock y ausencia de patrones de integración o renderizado SPA:

```bash
npm test
```

También se pueden validar sintácticamente los módulos propios y el servidor:

```bash
find js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
node --check server.cjs
```

## Estructura

```text
index.html
home/home.css
markets/market.html
markets/market.js
oracle/oracle.html
oracle/oracle.js
infra/infrastructure.html
infra/infrastructure.js
css/styles.css
js/app.js
js/mock-data.js
js/page-data.js
js/utils.js
js/components/chart.js
server.cjs
package.json
package-lock.json
tests/smoke.mjs
logo.png
```

Los directorios `backend/` y `contracts/`, si existen en el repositorio, quedan fuera del alcance de esta etapa y no se modifican.
