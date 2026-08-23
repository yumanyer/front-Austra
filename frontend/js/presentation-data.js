const DEFAULT_ANCHOR_PRICE = 51.25;

const HISTORY_SHAPES = {
  "1H": {
    intervalMs: 10 * 60 * 1000,
    points: [
      [-0.006, -0.004],
      [-0.004, -0.003],
      [-0.005, -0.004],
      [-0.002, -0.003],
      [0.001, -0.001],
      [-0.001, 0.000],
      [0.003, 0.002],
      [0.002, 0.003],
      [0.000, 0.001],
      [0.004, 0.003],
      [0.002, 0.002],
      [0.000, 0.000],
    ],
  },
  "1D": {
    intervalMs: 2 * 60 * 60 * 1000,
    points: [
      [-0.018, -0.013],
      [-0.014, -0.011],
      [-0.016, -0.013],
      [-0.009, -0.010],
      [-0.004, -0.006],
      [0.002, -0.001],
      [-0.001, 0.002],
      [0.006, 0.005],
      [0.004, 0.007],
      [0.009, 0.008],
      [0.006, 0.006],
      [0.000, 0.000],
    ],
  },
  "1W": {
    intervalMs: 12 * 60 * 60 * 1000,
    points: [
      [-0.043, -0.034],
      [-0.034, -0.030],
      [-0.038, -0.033],
      [-0.024, -0.026],
      [-0.018, -0.021],
      [-0.009, -0.014],
      [-0.013, -0.009],
      [-0.002, -0.004],
      [0.006, 0.002],
      [0.013, 0.008],
      [0.008, 0.006],
      [0.000, 0.000],
    ],
  },
};

export const PRESENTATION_DATA = Object.freeze({
  openInterest: "$2.84M",
  volume24h: "$1.27M",
});

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function roundPrice(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function getPresentationHistory(period = "1H", { price, ema } = {}) {
  const shape = HISTORY_SHAPES[period] || HISTORY_SHAPES["1H"];
  const currentPrice = finitePositive(price) ?? DEFAULT_ANCHOR_PRICE;
  const currentEma = finitePositive(ema) ?? currentPrice;
  const now = Date.now();
  const lastIndex = shape.points.length - 1;

  return shape.points.map(([priceOffset, emaOffset], index) => ({
    timestamp: now - (lastIndex - index) * shape.intervalMs,
    price: index === lastIndex ? roundPrice(currentPrice) : roundPrice(currentPrice * (1 + priceOffset)),
    ema: index === lastIndex ? roundPrice(currentEma) : roundPrice(currentEma * (1 + emaOffset)),
  }));
}
