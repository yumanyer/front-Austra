/**
 * Shape of the raw tick received from Data912 live endpoints
 * (/live/usa_adrs in USD, /live/arg_stocks in ARS — same shape).
 * @typedef {Object} Data912Tick
 * @property {string} symbol
 * @property {number} q_bid
 * @property {number} px_bid
 * @property {number} px_ask
 * @property {number} q_ask
 * @property {number} v
 * @property {number} q_op
 * @property {number} c          - last traded price (reference price)
 * @property {number} pct_change
 */

/**
 * Output of the normalization layer.
 * @typedef {Object} NormalizedTick
 * @property {string}  symbol
 * @property {number}  price          - USD, 6 decimal precision
 * @property {number}  bid
 * @property {number}  ask
 * @property {number}  spread         - ask - bid
 * @property {number|null} spreadPct  - spread / price, null when there is no book
 * @property {boolean} bookStale      - true when the book is too wide to trust
 * @property {number}  pctChange
 * @property {number|null} localPriceArs - BYMA price of the same underlying, in ARS
 * @property {number}  adrRatio       - local shares per ADR (10 for YPF and GGAL)
 * @property {number|null} impliedCcl - localPriceArs * adrRatio / price
 * @property {number|null} reportedCcl - market reference CCL rate
 * @property {number|null} cclSampled - how many liquid pairs the reference sampled
 * @property {number|null} cclDeviation - |implied - reported| / reported
 * @property {"ok"|"suspect"|"unavailable"} crossCheck
 */

/**
 * Response shape for GET /oracle/price/:symbol
 * @typedef {Object} OraclePriceResponse
 * @property {string}  symbol
 * @property {number}  price         - published price, USD, 6 decimal precision
 * @property {number|null} ema       - exponential moving average of accepted prices
 * @property {number|null} lastPrint - last untouched print observed from the feed
 * @property {number}  bid
 * @property {number}  ask
 * @property {number}  spread
 * @property {number|null} spreadPct
 * @property {boolean} bookStale
 * @property {number}  pctChange
 * @property {number|null} localPriceArs
 * @property {number|null} adrRatio
 * @property {number|null} impliedCcl
 * @property {number|null} reportedCcl
 * @property {number|null} cclSampled
 * @property {number|null} cclDeviation
 * @property {"ok"|"suspect"|"unavailable"} crossCheck
 * @property {number|null} deviation     - |price - ema| / ema for this tick
 * @property {string|null} breakerReason - "price_deviation" | "ccl_mismatch" | null
 * @property {number|null} frozenAt      - Unix seconds the freeze started
 * @property {number}  timestamp     - Unix seconds UTC
 * @property {number|null} lastPrintAt - Unix seconds of the last successful fetch
 * @property {"valid"|"frozen"|"stale"|"error"} status
 * @property {"data912"|"ema_fallback"|"simulated"} source
 * @property {boolean} simulated     - true when the price is synthetic
 * @property {boolean} marketOpen
 */

/**
 * Response shape for GET /market/:symbol
 * @typedef {Object} MarketResponse
 * @property {string}  symbol
 * @property {number}  markPrice     - post-circuit-breaker price
 * @property {number}  indexPrice    - last untouched print
 * @property {number}  fundingRate
 * @property {number}  maxLeverage
 * @property {"live"|"rehearsal"|"offline"} marketStatus
 * @property {string}  oracleStatus
 * @property {string}  oracleSource
 * @property {boolean} simulated
 * @property {string|null} lastPushTx
 * @property {number}  lastPushAt
 */

export {};
