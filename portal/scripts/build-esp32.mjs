import { gzip as gzipBuffer } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const gzip = promisify(gzipBuffer);
const portalDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(portalDir, 'dist');
const firmwareDir = path.resolve(portalDir, '..', 'firmware');
const targetDir = path.join(firmwareDir, 'data');
const stagingDir = path.join(firmwareDir, '.data-staging');
const backupDir = path.join(firmwareDir, `.data-backup-${Date.now()}`);

await fs.rm(stagingDir, { recursive: true, force: true });
await fs.cp(distDir, stagingDir, { recursive: true });

const assetFiles = [];
const collectAssetFiles = async (dir) => {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectAssetFiles(entryPath);
    else if (/\.(html|css|js|svg)$/.test(entry.name)) assetFiles.push(entryPath);
  }
};
await collectAssetFiles(stagingDir);
for (const file of assetFiles) {
  const source = await fs.readFile(file);
  await fs.writeFile(`${file}.gz`, await gzip(source, { level: 9 }));
}

let movedExisting = false;
try {
  await fs.rename(targetDir, backupDir);
  movedExisting = true;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

try {
  await fs.rename(stagingDir, targetDir);
  if (movedExisting) await fs.rm(backupDir, { recursive: true, force: true });
} catch (error) {
  await fs.rm(targetDir, { recursive: true, force: true });
  if (movedExisting) await fs.rename(backupDir, targetDir);
  throw error;
}

const sizes = [];
const walk = async (dir) => {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(entryPath);
    else sizes.push({ file: path.relative(targetDir, entryPath), bytes: (await fs.stat(entryPath)).size });
  }
};
await walk(targetDir);
const total = sizes.reduce((sum, item) => sum + item.bytes, 0);
console.log(`ESP32 portal assets copied to ${targetDir}`);
console.log(`Total: ${(total / 1024).toFixed(1)} KB`);
console.log(sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 8).map((item) => `  ${(item.bytes / 1024).toFixed(1)} KB  ${item.file}`).join('\n'));
