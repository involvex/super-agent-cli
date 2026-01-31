const path = require("path");
const fs = require("fs");

const srcDir = path.join(__dirname, "src");
const outDir = path.join(__dirname, "out");

// Ensure out directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Copy CSS and TypeScript files
const filesToCopy = ["chat.css", "chat.ts"];

for (const file of filesToCopy) {
  const srcPath = path.join(srcDir, file);
  const outPath = path.join(outDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, outPath);
    console.log(`Copied ${file} to out/`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
}
