import sharp from "sharp";
import { readFileSync } from "node:fs";
const logo = readFileSync("docs/public/brand-mark.svg", "utf8").replace(
  /<svg[^>]*>/,
  '<svg x="795" y="185" width="320" height="240" viewBox="48 15 152 102">',
);
const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#fafafa"/><rect x="32" y="32" width="1136" height="566" rx="24" fill="white" stroke="#e4e4e7"/><rect x="72" y="82" width="8" height="30" rx="4" fill="#0ea5e9"/><text x="96" y="107" font-family="sans-serif" font-size="28" font-weight="600" fill="#0284c7">BakaSU</text><text x="72" y="235" font-family="sans-serif" font-size="60" font-weight="700" fill="#18181b">A more stable</text><text x="72" y="311" font-family="sans-serif" font-size="60" font-weight="700" fill="#18181b">fork of SukiSU.</text><text x="72" y="382" font-family="sans-serif" font-size="25" fill="#71717a">Guides. Devices. Kernel integration.</text><line x1="72" y1="498" x2="1128" y2="498" stroke="#e4e4e7"/><text x="72" y="550" font-family="sans-serif" font-size="24" fill="#71717a">bakasu.org</text><text x="927" y="550" font-family="sans-serif" font-size="22" fill="#71717a">Documentation</text>${logo}</svg>`;
await sharp(Buffer.from(svg)).png().toFile("docs/public/social-card.png");
