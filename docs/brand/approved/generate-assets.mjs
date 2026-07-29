import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const { execFileSync } = NodeChildProcess;
const { readFileSync, writeFileSync, mkdirSync } = NodeFS;
const { dirname, join } = NodePath;
const { fileURLToPath } = NodeURL;

const approvedDirectory = dirname(fileURLToPath(import.meta.url));
const source = join(approvedDirectory, "../concepts/round-2/c2-refined.png");
const assetsDirectory = join(approvedDirectory, "assets");
const proofsDirectory = join(approvedDirectory, "proofs");

mkdirSync(assetsDirectory, { recursive: true });
mkdirSync(proofsDirectory, { recursive: true });

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function magick(args) {
  const output = args.at(-1);
  if (output === undefined) throw new Error("ImageMagick output path is required.");
  run("magick", [
    "-define",
    "png:exclude-chunks=date,time",
    ...args.slice(0, -1),
    "-strip",
    output,
  ]);
}

function writeEmbeddedSvg({ outputName, pngName, width, height, title, description }) {
  const pngPath = join(assetsDirectory, pngName);
  const encodedPng = readFileSync(pngPath).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title description">
  <title id="title">${title}</title>
  <desc id="description">${description}</desc>
  <image width="${width}" height="${height}" href="data:image/png;base64,${encodedPng}"/>
</svg>
`;
  writeFileSync(join(approvedDirectory, outputName), svg);
}

function renderSvg(svgName, outputName, width, height) {
  run("rsvg-convert", [
    "-w",
    String(width),
    "-h",
    String(height),
    join(approvedDirectory, svgName),
    "-o",
    join(proofsDirectory, outputName),
  ]);
}

function makeFlatTile(inputName, outputName) {
  magick([
    join(proofsDirectory, inputName),
    "-thumbnail",
    "700x500",
    "-background",
    "white",
    "-gravity",
    "center",
    "-extent",
    "700x500",
    "-alpha",
    "remove",
    "-alpha",
    "off",
    join(proofsDirectory, outputName),
  ]);
}

// Extract the approved designs from the exact presentation source.
magick([
  source,
  "-crop",
  "564x600+0+120",
  "+repage",
  "-fuzz",
  "3%",
  "-trim",
  "-alpha",
  "on",
  "-fuzz",
  "7%",
  "-transparent",
  "white",
  "-resize",
  "864x864",
  "-gravity",
  "center",
  "-background",
  "none",
  "-extent",
  "1024x1024",
  join(assetsDirectory, "sigidi-mark-1024.png"),
]);

magick([
  source,
  "-crop",
  "460x460+590+235",
  "+repage",
  "-fuzz",
  "3%",
  "-trim",
  "-background",
  "white",
  "-gravity",
  "center",
  "-extent",
  "415x415",
  "-filter",
  "Lanczos",
  "-resize",
  "1024x1024",
  "-alpha",
  "on",
  "-fuzz",
  "7%",
  "-fill",
  "none",
  "-draw",
  "alpha 0,0 floodfill",
  "-resize",
  "86%",
  "-gravity",
  "center",
  "-background",
  "none",
  "-extent",
  "1024x1024",
  join(assetsDirectory, "sigidi-app-icon-production-1024.png"),
]);

magick([
  source,
  "-crop",
  "653x400+1040+270",
  "+repage",
  "-fuzz",
  "3%",
  "-trim",
  "-alpha",
  "on",
  "-fuzz",
  "7%",
  "-transparent",
  "white",
  join(assetsDirectory, "sigidi-lockup.png"),
]);

magick([
  source,
  "-crop",
  "368x220+1325+370",
  "+repage",
  "-fuzz",
  "3%",
  "-trim",
  "-alpha",
  "on",
  "-fuzz",
  "7%",
  "-transparent",
  "white",
  join(assetsDirectory, "sigidi-wordmark.png"),
]);

// Embed the exact approved raster derivatives in portable SVG containers.
writeEmbeddedSvg({
  outputName: "sigidi-mark.svg",
  pngName: "sigidi-mark-1024.png",
  width: 1024,
  height: 1024,
  title: "SIGIDI C2 mark",
  description: "The approved C2 Forged Automaton mark.",
});

writeEmbeddedSvg({
  outputName: "sigidi-mark-small.svg",
  pngName: "sigidi-mark-1024.png",
  width: 1024,
  height: 1024,
  title: "SIGIDI C2 small mark",
  description: "The approved C2 mark in a portable container for small-size rendering.",
});

writeEmbeddedSvg({
  outputName: "sigidi-wordmark.svg",
  pngName: "sigidi-wordmark.png",
  width: 317,
  height: 99,
  title: "SIGIDI wordmark",
  description: "The exact approved uppercase SIGIDI wordmark.",
});

writeEmbeddedSvg({
  outputName: "sigidi-lockup.svg",
  pngName: "sigidi-lockup.png",
  width: 594,
  height: 221,
  title: "SIGIDI horizontal lockup",
  description: "The exact approved C2 mark and SIGIDI wordmark lockup.",
});

writeEmbeddedSvg({
  outputName: "sigidi-app-icon-production.svg",
  pngName: "sigidi-app-icon-production-1024.png",
  width: 1024,
  height: 1024,
  title: "SIGIDI production app icon",
  description: "The exact approved iron-black SIGIDI app icon with an ember axe blade.",
});

// Render every SVG container for visual and pixel-equivalence checks.
renderSvg("sigidi-mark.svg", "rendered-mark.png", 1024, 1024);
renderSvg("sigidi-mark-small.svg", "rendered-small-mark.png", 1024, 1024);
renderSvg("sigidi-wordmark.svg", "rendered-wordmark.png", 317, 99);
renderSvg("sigidi-lockup.svg", "rendered-lockup.png", 594, 221);
renderSvg("sigidi-app-icon-production.svg", "rendered-app-icon.png", 1024, 1024);

// Build the approval board from rendered SVG outputs.
makeFlatTile("rendered-mark.png", "tile-mark.png");
makeFlatTile("rendered-app-icon.png", "tile-app-icon.png");
makeFlatTile("rendered-lockup.png", "tile-lockup.png");
makeFlatTile("rendered-wordmark.png", "tile-wordmark.png");
magick([
  join(proofsDirectory, "tile-mark.png"),
  join(proofsDirectory, "tile-app-icon.png"),
  "+append",
  join(proofsDirectory, "board-row-one.png"),
]);
magick([
  join(proofsDirectory, "tile-lockup.png"),
  join(proofsDirectory, "tile-wordmark.png"),
  "+append",
  join(proofsDirectory, "board-row-two.png"),
]);
magick([
  join(proofsDirectory, "board-row-one.png"),
  join(proofsDirectory, "board-row-two.png"),
  "-append",
  join(proofsDirectory, "vector-approval-board.png"),
]);

// Render the exact approved mark at native small sizes.
renderSvg("sigidi-mark-small.svg", "small-mark-256.png", 256, 256);
renderSvg("sigidi-mark-small.svg", "small-mark-32.png", 32, 32);
renderSvg("sigidi-mark-small.svg", "small-mark-16.png", 16, 16);
magick([
  join(proofsDirectory, "small-mark-256.png"),
  "-background",
  "white",
  "-alpha",
  "remove",
  "-alpha",
  "off",
  join(proofsDirectory, "small-mark-256-flat.png"),
]);
magick([
  join(proofsDirectory, "small-mark-32.png"),
  "-filter",
  "point",
  "-resize",
  "800%",
  "-background",
  "white",
  "-alpha",
  "remove",
  "-alpha",
  "off",
  join(proofsDirectory, "small-mark-32-upscaled.png"),
]);
magick([
  join(proofsDirectory, "small-mark-16.png"),
  "-filter",
  "point",
  "-resize",
  "1600%",
  "-background",
  "white",
  "-alpha",
  "remove",
  "-alpha",
  "off",
  join(proofsDirectory, "small-mark-16-upscaled.png"),
]);
magick([
  join(proofsDirectory, "small-mark-256-flat.png"),
  join(proofsDirectory, "small-mark-32-upscaled.png"),
  join(proofsDirectory, "small-mark-16-upscaled.png"),
  "+append",
  join(proofsDirectory, "small-mark-size-proof.png"),
]);
