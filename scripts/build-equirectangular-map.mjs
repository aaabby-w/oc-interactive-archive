import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const X = [1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322];
const Y = [0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1];
const ROBINSON_HALF_HEIGHT = 91.296;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "public/maps/world-robinson.svg");
const targetDirectory = path.join(root, "public/maps");

function inversePoint(x, y) {
  const ratio = Math.min(1, Math.abs(y) / ROBINSON_HALF_HEIGHT);
  let index = 0;
  while (index < Y.length - 2 && ratio > Y[index + 1]) index += 1;
  const span = Y[index + 1] - Y[index] || 1;
  const latitude = Math.min(90, (index + (ratio - Y[index]) / span) * 5) * (y <= 0 ? 1 : -1);
  const absoluteLatitude = Math.abs(latitude);
  const lower = Math.min(Math.floor(absoluteLatitude / 5), X.length - 2);
  const fraction = (absoluteLatitude - lower * 5) / 5;
  const xCoefficient = X[lower] + (X[lower + 1] - X[lower]) * fraction;
  const longitude = Math.max(-180, Math.min(180, x / xCoefficient));
  return `${longitude.toFixed(3)},${(-latitude).toFixed(3)}`;
}

const source = await readFile(sourcePath, "utf8");
let geometry = source.replace(/viewBox="[^"]+"/, 'viewBox="-180 -90 360 180"');
geometry = geometry.replace(/width="[^"]+" height="[^"]+"/, 'width="2048" height="1024"');
geometry = geometry.replace(/Robinson projection\./, "Equirectangular projection generated from the bundled Robinson geometry.");
geometry = geometry.replace(/d="([^"]+)"/g, (attribute, data) => {
  if (!/[ML]/.test(data)) return attribute;
  const projected = data.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => inversePoint(Number(x), Number(y)));
  return `d="${projected}"`;
});

const palettes = {
  light: {
    outline: "#5e7f78",
    base: "#a7c8be",
    shades: ["#b7d5cc", "#92b9ad", "#c4dcd4", "#82aa9f"],
  },
  dark: {
    outline: "#96c3b5",
    base: "#31554e",
    shades: ["#3c655c", "#294a44", "#477268", "#233f3b"],
  },
};

function render(palette) {
  return geometry.replace(/<style type="text\/css">[\s\S]*?<\/style>/, `<style type="text/css">
    .country { stroke: ${palette.outline}; stroke-width: .16; fill: ${palette.base}; }
    .country > g:nth-child(5n + 1) path { fill: ${palette.shades[0]}; }
    .country > g:nth-child(5n + 2) path { fill: ${palette.shades[1]}; }
    .country > g:nth-child(5n + 3) path { fill: ${palette.shades[2]}; }
    .country > g:nth-child(5n + 4) path { fill: ${palette.shades[3]}; }
    circle { display: none; }
    .water { fill: transparent; stroke: none; }
  </style>`);
}

const outputs = [
  ["world-equirectangular.svg", render(palettes.light)],
  ["world-equirectangular-light.svg", render(palettes.light)],
  ["world-equirectangular-dark.svg", render(palettes.dark)],
];

await Promise.all(outputs.map(([filename, svg]) => writeFile(path.join(targetDirectory, filename), svg)));
console.log(`Generated ${outputs.map(([filename]) => filename).join(", ")}`);
