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

// Copy ws dependency to out/node_modules for packaging
const wsSrc = path.join(__dirname, "node_modules", "ws");
const wsDest = path.join(outDir, "node_modules", "ws");

if (fs.existsSync(wsSrc)) {
  // Copy recursively
  copyDirectory(wsSrc, wsDest);
  console.log("Copied ws to out/node_modules/");
} else {
  console.warn("ws not found in node_modules");
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Note: icon.png is already in the extension root, no need to copy
