#!/usr/bin/env node

/**
 * Version Bumper for Co-op Calendar
 * Usage:
 *   node bump-version.js        (increments version by +0.1)
 *   node bump-version.js 3.8    (sets explicit version to 3.8)
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const APP_JS_PATH = path.join(DIR, 'app.js');
const SW_JS_PATH = path.join(DIR, 'sw.js');
const INDEX_HTML_PATH = path.join(DIR, 'index.html');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function computeNextVersion(current) {
  const clean = current.trim().replace(/^v/i, '');
  const val = parseFloat(clean);
  if (isNaN(val)) {
    throw new Error(`Impossible de parser la version actuelle: "${current}"`);
  }
  const parts = clean.split('.');
  const decimals = parts.length > 1 ? parts[1].length : 1;
  const factor = Math.pow(10, decimals);
  return (Math.round((val + 0.1) * factor) / factor).toFixed(decimals);
}

function run() {
  console.log('🔄 Bumping Co-op Calendar version...');

  // 1. Lire app.js pour extraire la version actuelle
  const appJs = read(APP_JS_PATH);
  const match = appJs.match(/const\s+APP_VERSION\s*=\s*['"]v?([\d.]+)['"];/);
  if (!match) {
    console.error('❌ Version introuvable dans app.js');
    process.exit(1);
  }

  const oldVer = match[1];
  const customVer = process.argv[2] ? process.argv[2].trim().replace(/^v/i, '') : null;
  const newVer = customVer || computeNextVersion(oldVer);

  if (oldVer === newVer) {
    console.log(`⚠️ La version cible (${newVer}) est identique à la version actuelle (${oldVer}). Aucun changement.`);
    return;
  }

  console.log(`📌 Version: v${oldVer} ➔ v${newVer}`);

  // 2. Mettre à jour app.js
  const newAppJs = appJs.replace(
    /(const\s+APP_VERSION\s*=\s*['"])v?[\d.]+(['"];)/,
    `$1v${newVer}$2`
  );
  write(APP_JS_PATH, newAppJs);
  console.log('  ✓ app.js mis à jour');

  // 3. Mettre à jour sw.js
  if (fs.existsSync(SW_JS_PATH)) {
    const swJs = read(SW_JS_PATH);
    const newSwJs = swJs.replace(
      /(const\s+APP_VERSION\s*=\s*['"])v?[\d.]+(['"];)/,
      `$1v${newVer}$2`
    );
    write(SW_JS_PATH, newSwJs);
    console.log('  ✓ sw.js mis à jour');
  }

  // 4. Mettre à jour index.html (badge + cache busters styles.css?v= et app.js?v=)
  if (fs.existsSync(INDEX_HTML_PATH)) {
    let indexHtml = read(INDEX_HTML_PATH);
    indexHtml = indexHtml.replace(/(styles\.css\?v=)[\d.]+/g, `$1${newVer}`);
    indexHtml = indexHtml.replace(/(app\.js\?v=)[\d.]+/g, `$1${newVer}`);
    indexHtml = indexHtml.replace(
      /(id=["']appVersionBadge(?:Home)?["'][^>]*>v?)[\d.]+(<\/span>)/g,
      `$1${newVer}$2`
    );
    write(INDEX_HTML_PATH, indexHtml);
    console.log('  ✓ index.html mis à jour');
  }

  console.log(`✅ Co-op Calendar mis à jour avec succès en v${newVer} !`);
}

run();
