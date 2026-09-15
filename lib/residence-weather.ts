export type ResidenceWeather = "clear" | "cloudy" | "rain" | "storm" | "rainbow";

export type ResidenceWeatherState = {
  kind: ResidenceWeather;
  startedAt: number;
  endsAt: number;
};

const minute = 60_000;
const day = 24 * 60 * minute;

function durationFor(kind: ResidenceWeather, random: () => number) {
  const ranges: Record<ResidenceWeather, [number, number]> = {
    clear: [90, 1440],
    cloudy: [20, 360],
    rain: [15, 180],
    storm: [5, 45],
    rainbow: [5, 18],
  };
  const [minimum, maximum] = ranges[kind];
  return Math.round(minimum + random() * (maximum - minimum)) * minute;
}

export function createResidenceWeather(
  now = Date.now(),
  random: () => number = Math.random,
): ResidenceWeatherState {
  const hour = new Date(now).getHours();
  const night = hour < 6 || hour >= 19;
  const roll = random();
  let kind: ResidenceWeather;

  if (night) {
    kind = roll < 0.78 ? "clear" : roll < 0.9 ? "cloudy" : roll < 0.98 ? "rain" : "storm";
  } else {
    kind = roll < 0.74 ? "clear" : roll < 0.88 ? "cloudy" : roll < 0.96 ? "rain" : roll < 0.995 ? "storm" : "rainbow";
  }

  return {
    kind,
    startedAt: now,
    endsAt: now + durationFor(kind, random),
  };
}

export function restoreResidenceWeather(raw: string | null, now = Date.now()) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ResidenceWeatherState>;
    const validKind = ["clear", "cloudy", "rain", "storm", "rainbow"].includes(parsed.kind ?? "");
    const validTimes = typeof parsed.startedAt === "number"
      && typeof parsed.endsAt === "number"
      && parsed.endsAt > now
      && parsed.endsAt - parsed.startedAt >= 5 * minute
      && parsed.endsAt - parsed.startedAt <= day;
    return validKind && validTimes ? parsed as ResidenceWeatherState : null;
  } catch {
    return null;
  }
}

export function getWeatherSceneKey(kind: ResidenceWeather, date: Date) {
  if (kind !== "clear") return kind;
  const hour = date.getHours();
  return hour < 6 || hour >= 19 ? "clear-night" : "clear-day";
}
