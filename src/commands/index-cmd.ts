import { Command } from "commander";
import fs from "fs/promises";
import ignore from "ignore";
import chalk from "chalk";
import path from "path";

// Default ignore patterns
const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".env",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
];

export function createIndexCommand(): Command {
  const indexCommand = new Command("index")
    .description(" recursively index a directory and save to a file")
    .argument("[directory]", "Directory to index", ".")
    .option("-o, --output <file>", "Output file path (default: index.md)")
    .option("--no-ignore", "Disable .gitignore respecting")
    .option("-d, --depth <depth>", "Max depth to traverse", "10")
    .action(async (directory: string, options) => {
      try {
        const rootDir = path.resolve(directory);
        const outputFile = options.output
          ? path.resolve(options.output)
          : path.join(rootDir, "index.md");
        const maxDepth = parseInt(options.depth);

        console.log(chalk.blue(`Indexing directory: ${rootDir}`));

        // Initialize ignore filter
        const ig = ignore().add(DEFAULT_IGNORES);

        if (options.ignore !== false) {
          try {
            const gitignorePath = path.join(rootDir, ".gitignore");
            const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
            ig.add(gitignoreContent);
          } catch (e) {
            // No .gitignore found, proceed with defaults
          }
        }

        let outputContent = `# Directory Index\n\nGenerated for: ${rootDir}\nDate: ${new Date().toISOString()}\n\n`;
        outputContent += "## File Structure\n\n```\n";

        // Helper function to build tree structure
        async function buildTree(
          currentPath: string,
          depth: number,
          prefix: string = "",
        ): Promise<void> {
          if (depth > maxDepth) {
            return;
          }

          const relativePath = path.relative(rootDir, currentPath);
          if (relativePath && ig.ignores(relativePath)) {
            return;
          }

          const stats = await fs.stat(currentPath);
          const isDir = stats.isDirectory();
          const name = path.basename(currentPath);

          if (isDir) {
            if (relativePath) {
              // Avoid printing root dot
              outputContent += `${prefix}${name}/\n`;
            }

            const entries = await fs.readdir(currentPath, {
              withFileTypes: true,
            });
            // Sort: directories first, then files
            const sortedEntries = entries.sort((a, b) => {
              if (a.isDirectory() && !b.isDirectory()) {
                return -1;
              }
              if (!a.isDirectory() && b.isDirectory()) {
                return 1;
              }
              return a.name.localeCompare(b.name);
            });

            for (let i = 0; i < sortedEntries.length; i++) {
              const entry = sortedEntries[i];
              const isLast = i === sortedEntries.length - 1;
              const newPrefix = relativePath ? prefix + "  " : ""; // Simple indentation
              // Better tree ASCII art could be implemented here
              await buildTree(
                path.join(currentPath, entry.name),
                depth + 1,
                newPrefix,
              );
            }
          } else {
            outputContent += `${prefix}${name}\n`;
          }
        }

        // Better implementation that actually does a recursive walk and generates a list with summaries could be better for LLM consumption.
        // For now, let's just do a file list with some basic content summary if it's text.
        // Actually, the user requirement is "Directory Indexing".
        // Let's implement a simple file walker that generates a markdown list.

        const files: string[] = [];

        async function walk(dir: string, currentDepth: number) {
          if (currentDepth > maxDepth) {
            return;
          }

          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(rootDir, fullPath);

            if (ig.ignores(relPath)) {
              continue;
            }

            if (entry.isDirectory()) {
              await walk(fullPath, currentDepth + 1);
            } else {
              files.push(relPath);
            }
          }
        }

        await walk(rootDir, 0);

        console.log(chalk.blue(`Found ${files.length} files.`));

        // Generate content
        // outputContent is reset here as tree approach above was complex to get right quickly inline
        outputContent = `# Project Index: ${path.basename(rootDir)}\n\n`;
        outputContent += `Total Files: ${files.length}\n\n`;
        outputContent += `## Files\n\n`;

        for (const file of files) {
          outputContent += `### ${file}\n`;
          // Add file Stats?
          const stats = await fs.stat(path.join(rootDir, file));
          outputContent += `- Size: ${stats.size} bytes\n`;
          outputContent += `- Modified: ${stats.mtime.toISOString()}\n\n`;
        }

        await fs.writeFile(outputFile, outputContent);

        console.log(chalk.green(`✓ Index generated at: ${outputFile}`));
      } catch (error: any) {
        console.error(chalk.red(`Error indexing directory: ${error.message}`));
        process.exit(1);
      }
    });

  return indexCommand;
}
