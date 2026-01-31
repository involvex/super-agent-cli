import * as fs from "fs-extra";
import * as path from "path";

/**
 * Build script for preparing web assets for Firebase Hosting.
 * Copies files from src/web/client to dist/web for deployment.
 */

async function buildWeb(): Promise<void> {
  const srcDir = path.join(process.cwd(), "src/web/client");
  const destDir = path.join(process.cwd(), "dist/web");

  console.log("Building web assets for Firebase Hosting...");

  // Ensure source directory exists
  if (!(await fs.pathExists(srcDir))) {
    console.error(`Source directory not found: ${srcDir}`);
    console.error("Please ensure src/web/client exists with web assets.");
    process.exit(1);
  }

  // Ensure destination directory exists
  await fs.ensureDir(destDir);

  // Copy web client files to dist/web
  const filesCopied = await fs.copy(srcDir, destDir, {
    filter: src => !src.includes("node_modules"),
  });

  console.log("✅ Web assets prepared: dist/web");
  console.log(`   Source: ${srcDir}`);
  console.log(`   Destination: ${destDir}`);

  // List what was copied
  const files = await fs.readdir(destDir);
  console.log(`   Files: ${files.length} items copied`);
}

buildWeb().catch(error => {
  console.error("Build failed:", error);
  process.exit(1);
});
