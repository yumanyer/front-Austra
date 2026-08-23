export const MOCK_SNAPSHOT = {
  mode: "mock",
  fetchedAt: "2026-08-23T03:40:00Z",
  health: { status: "READY", data: { status: "READY", version: "frontend-preview" } },
  market: {
    status: "success",
    data: {
      markPrice: 42.32,
      indexPrice: 42.315,
      fundingRate: 0.01,
      maxLeverage: 5,
      marketStatus: "LIVE",
      change24h: 1.24,
      volume24h: 1240000,
      openInterest: 428000,
      raw: {
        hip3Status: "ACTIVE",
        hyperCoreStatus: "ACTIVE",
        hyperEvmStatus: "ACTIVE",
        history: [
          { timestamp: "2026-08-22T21:00:00Z", price: 41.82, ema: 41.91 },
          { timestamp: "2026-08-22T21:10:00Z", price: 41.94, ema: 41.93 },
          { timestamp: "2026-08-22T21:20:00Z", price: 41.89, ema: 41.92 },
          { timestamp: "2026-08-22T21:30:00Z", price: 42.02, ema: 41.96 },
          { timestamp: "2026-08-22T21:40:00Z", price: 42.08, ema: 42.01 },
          { timestamp: "2026-08-22T21:50:00Z", price: 42.04, ema: 42.02 },
          { timestamp: "2026-08-22T22:00:00Z", price: 42.16, ema: 42.07 },
          { timestamp: "2026-08-22T22:10:00Z", price: 42.11, ema: 42.08 },
          { timestamp: "2026-08-22T22:20:00Z", price: 42.25, ema: 42.14 },
          { timestamp: "2026-08-22T22:30:00Z", price: 42.21, ema: 42.16 },
          { timestamp: "2026-08-22T22:40:00Z", price: 42.32, ema: 42.21 },
          { timestamp: "2026-08-22T22:50:00Z", price: 42.27, ema: 42.23 },
          { timestamp: "2026-08-22T23:00:00Z", price: 42.38, ema: 42.28 },
          { timestamp: "2026-08-22T23:10:00Z", price: 42.34, ema: 42.3 },
          { timestamp: "2026-08-22T23:20:00Z", price: 42.27, ema: 42.29 },
          { timestamp: "2026-08-22T23:30:00Z", price: 42.41, ema: 42.33 },
          { timestamp: "2026-08-22T23:40:00Z", price: 42.36, ema: 42.34 },
          { timestamp: "2026-08-22T23:50:00Z", price: 42.28, ema: 42.32 },
          { timestamp: "2026-08-23T00:00:00Z", price: 42.4, ema: 42.35 },
          { timestamp: "2026-08-23T00:10:00Z", price: 42.36, ema: 42.35 },
          { timestamp: "2026-08-23T00:20:00Z", price: 42.29, ema: 42.33 },
          { timestamp: "2026-08-23T00:30:00Z", price: 42.34, ema: 42.33 },
          { timestamp: "2026-08-23T00:40:00Z", price: 42.31, ema: 42.32 },
          { timestamp: "2026-08-23T00:50:00Z", price: 42.315, ema: 42.301 }
        ]
      }
    }
  },
  oracle: {
    status: "success",
    data: {
      price: 42.315,
      ema: 42.301,
      lastPrint: 42.32,
      bid: 42.3,
      ask: 42.34,
      spread: 0.04,
      ccl: 1180,
      impliedCcl: 1181.2,
      crossCheck: "PASS",
      status: "VALID",
      source: "Mock market feed",
      marketOpen: true,
      freshness: "3s ago",
      circuitBreaker: { status: "CLEAR", threshold: 10, deviation: 1.8, releaseTicks: "3 / 3" },
      raw: { sourceStatus: "READY", normalizerStatus: "VALID", normalizationDetail: "Book normalized" }
    }
  }
};
