// Bundles the third-party code the React "Try it" boxes need into site/vendor/, so the site keeps
// no build step and loads nothing from a CDN. One-time developer step: run it again only to
// upgrade the pinned versions in package.json (devDependencies), then commit site/vendor/.
//
//   node site/tools/build-vendor.mjs
//
// Output:
//   vendor/react/react.js       React + ReactDOM (createRoot) as window.React / window.ReactDOM.
//                               The development build: its warnings (missing `key`, a controlled
//                               input without onChange, hooks called conditionally) are part of
//                               what the boxes teach. Minified, so only the messages remain.
//   vendor/sucrase/sucrase.js   Sucrase's JSX transform as window.Sucrase.transform (classic
//                               runtime: <App /> → React.createElement(App)).
// Each folder gets the package's licence (MIT) and a VERSION file.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { ROOT } from './serve.mjs';

const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const version = (name) => JSON.parse(readFileSync(join(pkgDir(name), 'package.json'), 'utf8')).version;

const BUNDLES = [
  {
    dir: 'react',
    file: 'react.js',
    packages: ['react', 'react-dom'],
    contents: `import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
window.React = React;
window.ReactDOM = { ...ReactDOM, ...ReactDOMClient };`,
    define: { 'process.env.NODE_ENV': '"development"' },
  },
  {
    dir: 'sucrase',
    file: 'sucrase.js',
    packages: ['sucrase'],
    contents: `import { transform } from 'sucrase';
window.Sucrase = { transform };`,
    define: { 'process.env.NODE_ENV': '"production"' },
  },
];

for (const b of BUNDLES) {
  const out = join(ROOT, 'vendor', b.dir);
  mkdirSync(out, { recursive: true });
  const versions = b.packages.map((p) => `${p}@${version(p)}`).join(' ');
  await build({
    stdin: { contents: b.contents, resolveDir: ROOT, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    define: b.define,
    legalComments: 'none',
    banner: { js: `/* ${versions} · MIT licence: see LICENSE in this folder · bundled by site/tools/build-vendor.mjs */` },
    outfile: join(out, b.file),
  });
  copyFileSync(join(pkgDir(b.packages[0]), 'LICENSE'), join(out, 'LICENSE'));
  writeFileSync(join(out, 'VERSION'), `${versions}\n`);
  console.log(`✓ vendor/${b.dir}/${b.file} (${Math.round(statSync(join(out, b.file)).size / 1024)} KB) ${versions}`);
}
