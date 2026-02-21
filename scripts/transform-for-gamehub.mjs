#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

const GAME_ID = 'blackout';
const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'game-export', GAME_ID);

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeFile(filePath, content) {
  writeFileSync(filePath, content.trimStart());
}

function rewriteImports(dir) {
  const replacements = [
    ['@shared/', '@game-hub/blackout-shared/'],
    ['../../../../core/src/', '@game-hub/blackout-shared/'],
    ['../../../core/src/', '@game-hub/blackout-shared/'],
    ['../../core/src/', '@game-hub/blackout-shared/'],
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

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'web', 'src'), { recursive: true });
mkdirSync(join(OUT, 'server', 'src'), { recursive: true });
mkdirSync(join(OUT, 'shared', 'src'), { recursive: true });

cpSync(join(ROOT, 'ui-vue', 'src'), join(OUT, 'web', 'src'), { recursive: true });
cpSync(join(ROOT, 'server', 'src'), join(OUT, 'server', 'src'), { recursive: true });
cpSync(join(ROOT, 'core', 'src'), join(OUT, 'shared', 'src'), { recursive: true });

for (const sqliteFile of ['blackout.sqlite', 'blackout.sqlite-shm', 'blackout.sqlite-wal']) {
  const fullPath = join(OUT, 'server', 'src', 'db', sqliteFile);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

rewriteImports(OUT);

writeFile(
  join(OUT, 'server', 'src', 'index.ts'),
  `
import type { Server } from 'socket.io';
import { registerBlackout } from './socketHandlers';

export const definition = {
  id: 'blackout',
  name: 'Blackout',
  minPlayers: 3,
  maxPlayers: 20,
} as const;

/**
 * Socket plugin entry for Game Hub (/g/<gameId>).
 * Keeps compatibility with both '/g/blackout' and injected namespaces.
 */
export function register(io: Server, namespace = '/g/blackout') {
  return registerBlackout(io, namespace);
}

export const handler = { definition, register };
`
);

if (!existsSync(join(OUT, 'shared', 'src', 'index.ts'))) {
  writeFile(
    join(OUT, 'shared', 'src', 'index.ts'),
    `
export * from './types';
export * from './events';
export * from './constants';
`
  );
}

writeJson(join(OUT, 'shared', 'package.json'), {
  name: '@game-hub/blackout-shared',
  version: '1.0.0',
  type: 'module',
  main: 'dist/index.js',
  types: 'dist/index.d.ts',
  exports: {
    '.': {
      import: './dist/index.js',
      types: './dist/index.d.ts',
    },
    './events': {
      import: './dist/events.js',
      types: './dist/events.d.ts',
    },
    './types': {
      import: './dist/types.js',
      types: './dist/types.d.ts',
    },
    './constants': {
      import: './dist/constants.js',
      types: './dist/constants.d.ts',
    },
  },
  scripts: {
    build: 'tsup',
    typecheck: 'tsc --noEmit',
  },
  devDependencies: {
    tsup: '^8.4.2',
    typescript: '^5.9.3',
  },
});

writeJson(join(OUT, 'server', 'package.json'), {
  name: '@game-hub/blackout-server',
  version: '1.0.0',
  type: 'module',
  main: 'dist/index.js',
  exports: {
    '.': {
      import: './dist/index.js',
      types: './dist/index.d.ts',
    },
  },
  scripts: {
    build: 'tsup',
    typecheck: 'tsc --noEmit',
  },
  dependencies: {
    '@game-hub/blackout-shared': 'workspace:*',
    'better-sqlite3': '^11.0.0',
    nanoid: '^5.1.6',
    'socket.io': '^4.8.3',
  },
  devDependencies: {
    '@types/node': '^22.19.7',
    tsup: '^8.4.2',
    typescript: '^5.9.3',
  },
});

writeJson(join(OUT, 'web', 'package.json'), {
  name: '@game-hub/blackout-web',
  version: '1.0.0',
  type: 'module',
  main: 'src/index.ts',
  exports: {
    '.': './src/index.ts',
  },
  scripts: {
    typecheck: 'vue-tsc --noEmit',
  },
  dependencies: {
    '@game-hub/blackout-shared': 'workspace:*',
    pinia: '^3.0.0',
    'socket.io-client': '^4.8.3',
    vue: '^3.5.0',
  },
  devDependencies: {
    typescript: '^5.9.3',
    'vue-tsc': '^2.2.1',
  },
});

writeFile(
  join(OUT, 'shared', 'tsconfig.json'),
  `
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
`
);

writeFile(
  join(OUT, 'shared', 'tsconfig.build.json'),
  `
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false
  }
}
`
);

writeFile(
  join(OUT, 'shared', 'tsup.config.ts'),
  `
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/events.ts', 'src/types.ts', 'src/constants.ts'],
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.build.json',
  clean: true,
  sourcemap: true,
});
`
);

writeFile(
  join(OUT, 'server', 'tsconfig.json'),
  `
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
`
);

writeFile(
  join(OUT, 'server', 'tsconfig.build.json'),
  `
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false
  }
}
`
);

writeFile(
  join(OUT, 'server', 'tsup.config.ts'),
  `
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  shims: true,
  dts: true,
  tsconfig: 'tsconfig.build.json',
  clean: true,
  sourcemap: true,
});
`
);

writeFile(
  join(OUT, 'web', 'tsconfig.json'),
  `
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
`
);

writeFile(
  join(OUT, 'README.md'),
  `
# Blackout Game - Game Hub Integration

Generated export for integration into the Game Hub monorepo.

## Structure

- web/: Vue game UI package
- server/: Socket namespace package
- shared/: shared contracts package

## Next Steps in Game Hub

1. Copy this folder to \`games/blackout\`.
2. Register \`@game-hub/blackout-server\` in \`apps/platform-server/src/index.ts\`.
3. Register \`@game-hub/blackout-web\` in \`apps/platform-web/src/gameRegistry.ts\`.
4. Run \`pnpm install\`, \`pnpm typecheck\`, \`pnpm lint\`, \`pnpm test\`.
`
);

console.log('Game Hub export created at:', OUT);
