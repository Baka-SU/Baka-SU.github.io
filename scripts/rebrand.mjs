// Keep authored prose intact; apply branding at build time.
/** @param {string} value */
export const rebrand = (value) =>
  value
    .replaceAll("github.com/BakaSU/BakaSU.github.io", "github.com/Baka-SU/Baka-SU.github.io")
    .replaceAll("github.com/ReSukiSU/ReSukiSU.github.io", "github.com/Baka-SU/Baka-SU.github.io")
    .replaceAll("github.com/BakaSU/", "github.com/Baka-SU/")
    .replaceAll("github.com/ReSukiSU/ReSukiSU", "github.com/Baka-SU/BakaSU")
    .replaceAll("raw.githubusercontent.com/BakaSU/", "raw.githubusercontent.com/Baka-SU/")
    .replaceAll(
      "raw.githubusercontent.com/ReSukiSU/ReSukiSU",
      "raw.githubusercontent.com/Baka-SU/BakaSU",
    )
    .replaceAll("githubusercontent.com/ReSukiSU/ReSukiSU", "githubusercontent.com/Baka-SU/BakaSU")
    .replaceAll("nightly.link/BakaSU/", "nightly.link/Baka-SU/")
    .replaceAll("nightly.link/ReSukiSU/ReSukiSU", "nightly.link/Baka-SU/BakaSU")
    .replaceAll("resukisu.org", "bakasu.org")
    .replaceAll("ReSukiSU", "BakaSU");

export const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
