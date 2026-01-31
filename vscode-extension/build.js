const path = require("path");
const fs = require("fs");

const srcDir = path.join(__dirname, "src");
const outDir = path.join(__dirname, "out");

// Ensure out directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Copy webview assets (these are plain JS/CSS files that run in the browser)
const assetsToCopy = ["chat.js", "chat.css"];

for (const file of assetsToCopy) {
  const srcPath = path.join(srcDir, file);
  const outPath = path.join(outDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, outPath);
    console.log(`Copied ${file} to out/`);
  } else {
    console.warn(`Source file not found: ${srcPath}`);
  }
}

// Copy icon from assets/vscode/
const iconSrcPath = path.join(__dirname, "..", "assets", "vscode", "icon.svg");
const iconOutPath = path.join(outDir, "icon.svg");

if (fs.existsSync(iconSrcPath)) {
  fs.copyFileSync(iconSrcPath, iconOutPath);
  console.log(`Copied icon.svg to out/`);
} else {
  console.warn(`Icon file not found: ${iconSrcPath}`);
}
