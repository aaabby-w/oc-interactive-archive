import * as THREE from "three";
import type { ResidenceWeather } from "@/lib/residence-weather";

/** One recessed sky surface: every weather element is clipped to the window. */
export function createWindowWeather() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(4.48, 2.32), material);
  pane.name = "Window_RecessedWeather";
  pane.position.z = -0.08;
  let lastFrame = -1;
  let lastKey = "";
  const circle = (x: number, y: number, radius: number, color: string) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };
  const update = (weather: ResidenceWeather, night: boolean, time: number) => {
    const frame = Math.floor(time * 15);
    const key = `${weather}:${night}`;
    if (frame === lastFrame && key === lastKey) return;
    lastFrame = frame;
    lastKey = key;
    const rain = weather === "rain" || weather === "storm";
    const gradient = context.createLinearGradient(0, 0, 0, 384);
    gradient.addColorStop(0, night ? "#24384d" : rain ? "#77959e" : "#93c6ce");
    gradient.addColorStop(1, night ? "#5c7c88" : rain ? "#becdca" : "#e7e8cf");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 768, 384);
    if (night && !rain) {
      for (let i = 0; i < 24; i += 1) {
        circle(25 + i * 113 % 730, 16 + i * 47 % 200, i % 3 ? 1.2 : 2, "#f9eed3");
      }
      circle(593, 88, 36, "#f5e8bf");
      circle(607, 74, 33, "#2e4559");
    } else if (!rain) {
      const glow = context.createRadialGradient(592, 88, 30, 592, 88, 87);
      glow.addColorStop(0, "#ffe7a355");
      glow.addColorStop(1, "#ffe7a300");
      context.fillStyle = glow;
      context.fillRect(490, 0, 220, 200);
      circle(592, 88, 35, "#fbe6aa");
    }
    // Quiet distant hills create a view beyond the glass.
    [0, 1, 2].forEach((layer) => {
      context.fillStyle = night ? ["#59777d", "#496c71", "#3b5c64"][layer]
        : ["#b8c8b6", "#9fbca9", "#86a995"][layer];
      context.beginPath();
      context.moveTo(0, 384);
      for (let x = 0; x <= 768; x += 24) {
        context.lineTo(x, 284 + layer * 28 + Math.sin(x / 100 + layer * 2) * 20);
      }
      context.lineTo(768, 384);
      context.fill();
    });
    const cloudCount = weather === "clear" ? 2 : 5;
    for (let i = 0; i < cloudCount; i += 1) {
      const x = ((i * 223 + time * (2 + i)) % 940) - 80;
      const y = 62 + i * 37 % 135;
      const color = rain ? "#d4dedbcc" : night ? "#8da5ab66" : "#faf6e7cc";
      context.save();
      context.translate(x, y);
      context.scale(1, 0.62);
      circle(-31, 8, 27, color);
      circle(0, 0, 37, color);
      circle(35, 10, 25, color);
      context.restore();
    }
    if (weather === "rainbow") {
      ["#dca0a5", "#e6c093", "#ced5a4", "#93bfc1", "#a3a9c5"].forEach((color, i) => {
        context.beginPath();
        context.arc(350, 309, 142 - i * 7, Math.PI, Math.PI * 2);
        context.strokeStyle = color;
        context.globalAlpha = 0.48;
        context.lineWidth = 6;
        context.stroke();
      });
      context.globalAlpha = 1;
    }
    if (rain) {
      context.strokeStyle = "#e8f4ef88";
      context.lineWidth = 1.3;
      for (let i = 0; i < 58; i += 1) {
        const x = (i * 139 + time * 17) % 790;
        const y = (i * 73 + time * (weather === "storm" ? 245 : 165)) % 420 - 22;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 5, y + 17);
        context.stroke();
      }
      if (weather === "storm" && time % 23 < 0.18) {
        context.fillStyle = "#e3edf414";
        context.fillRect(0, 0, 768, 384);
      }
    }
    // Restrained reflected streaks, baked behind the physical window mullions.
    context.fillStyle = "#ffffff0b";
    context.beginPath();
    context.moveTo(80, 0); context.lineTo(116, 0);
    context.lineTo(320, 384); context.lineTo(284, 384); context.fill();
    texture.needsUpdate = true;
  };
  update("clear", false, 0);
  return { pane, update, dispose: () => texture.dispose() };
}
