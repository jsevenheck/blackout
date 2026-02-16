#!/usr/bin/env node
import { cpSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'game-export', 'blackout');

// Clean output
mkdirSync(join(OUT, 'web', 'src'), { recursive: true });
mkdirSync(join(OUT, 'server', 'src'), { recursive: true });
mkdirSync(join(OUT, 'shared', 'src'), { recursive: true });

// Copy sources
cpSync(join(ROOT, 'ui-vue', 'src'), join(OUT, 'web', 'src'), { recursive: true });
cpSync(join(ROOT, 'server', 'src'), join(OUT, 'server', 'src'), { recursive: true });
cpSync(join(ROOT, 'core', 'src'), join(OUT, 'shared', 'src'), { recursive: true });

// Rewrite imports in all .ts and .vue files
function rewriteImports(dir) {
  const replacements = [
    ['@shared/', '@game-hub/blackout-shared/'],
    ['../../core/src/', '@game-hub/blackout-shared/'],
    ['../../../core/src/', '@game-hub/blackout-shared/'],
    ['../../../../core/src/', '@game-hub/blackout-shared/'],
  ];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      rewriteImports(full);
      continue;
    }
    if (!full.endsWith('.ts') && !full.endsWith('.vue')) continue;
    let content = readFileSync(full, 'utf-8');
    for (const [from, to] of replacements) {
      content = content.replaceAll(from, to);
    }
    writeFileSync(full, content);
  }
}

rewriteImports(OUT);

// Generate package.json files
writeFileSync(
  join(OUT, 'shared', 'package.json'),
  JSON.stringify(
    {
      name: '@game-hub/blackout-shared',
      version: '1.0.0',
      main: 'src/types.ts',
      types: 'src/types.ts',
    },
    null,
    2
  )
);

writeFileSync(
  join(OUT, 'server', 'package.json'),
  JSON.stringify(
    {
      name: '@game-hub/blackout-server',
      version: '1.0.0',
      dependencies: {
        '@game-hub/blackout-shared': 'workspace:*',
        'better-sqlite3': '^11.0.0',
        nanoid: '^5.0.0',
        'socket.io': '^4.8.0',
      },
    },
    null,
    2
  )
);

writeFileSync(
  join(OUT, 'web', 'package.json'),
  JSON.stringify(
    {
      name: '@game-hub/blackout-web',
      version: '1.0.0',
      dependencies: {
        '@game-hub/blackout-shared': 'workspace:*',
        vue: '^3.5.0',
        pinia: '^3.0.0',
        'socket.io-client': '^4.8.0',
      },
    },
    null,
    2
  )
);

console.log('Game Hub export created at:', OUT);
