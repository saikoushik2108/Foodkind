/**
 * Fast syntax check for every frontend source file.
 *
 * Vite's build catches these too, but it stops at the first error and drags in
 * the whole dependency graph. This parses each file independently so every
 * broken file is reported in one pass.
 *
 * Usage: node scripts/check-syntax.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk('src').filter((file) => /\.(jsx?|mjs)$/.test(file));
let failures = 0;

for (const file of files) {
  try {
    esbuild.transformSync(fs.readFileSync(file, 'utf8'), {
      loader: file.endsWith('.jsx') ? 'jsx' : 'js',
      jsx: 'automatic',
    });
  } catch (error) {
    failures += 1;
    console.error(`\u2717 ${file}\n${String(error.message).split('\n').slice(0, 8).join('\n')}\n`);
  }
}

console.log(`${files.length} files checked, ${failures} with syntax errors`);
process.exit(failures ? 1 : 0);
