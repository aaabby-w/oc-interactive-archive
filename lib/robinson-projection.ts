const X_COEFFICIENTS = [
  1,
  0.9986,
  0.9954,
  0.99,
  0.9822,
  0.973,
  0.96,
  0.9427,
  0.9216,
  0.8962,
  0.8679,
  0.835,
  0.7986,
  0.7597,
  0.7186,
  0.6732,
  0.6213,
  0.5722,
  0.5322,
] as const;

const Y_COEFFICIENTS = [
  0,
  0.062,
  0.124,
  0.186,
  0.248,
  0.31,
  0.372,
  0.434,
  0.4958,
  0.5571,
  0.6176,
  0.6769,
  0.7346,
  0.7903,
  0.8435,
  0.8936,
  0.9394,
  0.9761,
  1,
] as const;

// The bundled Natural Earth SVG is a Robinson map centered at 11.25°E.
// Keeping this alongside the projection prevents future city records from
// accumulating hand-tuned x/y offsets that only fit one viewport.
const CENTRAL_MERIDIAN = 11.25;

function interpolate(table: readonly number[], latitude: number) {
  const absoluteLatitude = Math.min(90, Math.abs(latitude));
  const lowerIndex = Math.min(Math.floor(absoluteLatitude / 5), table.length - 2);
  const fraction = (absoluteLatitude - lowerIndex * 5) / 5;
  return table[lowerIndex] + (table[lowerIndex + 1] - table[lowerIndex]) * fraction;
}

function normalizeLongitude(longitude: number) {
  return ((longitude - CENTRAL_MERIDIAN + 540) % 360) - 180;
}

export function projectToRobinsonPercent(latitude: number, longitude: number) {
  const xCoefficient = interpolate(X_COEFFICIENTS, latitude);
  const yCoefficient = interpolate(Y_COEFFICIENTS, latitude);
  const projectedX = normalizeLongitude(longitude) * xCoefficient;
  const latitudeDirection = latitude === 0 ? 0 : Math.sign(latitude);

  return {
    x: ((projectedX + 180) / 360) * 100,
    y: 50 - latitudeDirection * yCoefficient * 50,
  };
}
