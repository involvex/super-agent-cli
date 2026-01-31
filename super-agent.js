#!/usr/bin/env bun
// Super Agent CLI wrapper script
// This ensures the bundled code runs with bun for proper module resolution

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import and run the bundled CLI
import(join(__dirname, "dist", "index.js"));
