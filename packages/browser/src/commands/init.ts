import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CommandValues } from '@xcli/core';

// eslint-disable-next-line require-await
export async function initCommand(args: string[], _values: CommandValues) {
  const name = args[0];
  if (!name) {
    console.error('Usage: xcli init <project-name>');
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`Invalid project name "${name}". Use lowercase letters, numbers, hyphens.`);
    process.exit(1);
  }

  const targetDir = join(process.cwd(), name);

  if (existsSync(targetDir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  mkdirSync(join(targetDir, '.xcli', 'plugins'), { recursive: true });

  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(
      {
        name,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'npx xcli plugins list',
        },
        dependencies: {
          zod: '^3.24.0',
        },
      },
      null,
      2
    )
  );

  writeFileSync(
    join(targetDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          types: ['node'],
        },
        include: ['.xcli/plugins/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    )
  );

  writeFileSync(join(targetDir, '.gitignore'), 'node_modules/\n.xcli/storage/\n');

  writeFileSync(
    join(targetDir, 'README.md'),
    `# ${name}

xcli plugin project.

## Usage

\`\`\`bash
# Create a plugin
npx xcli create my-plugin --template api --project

# List plugins
npx xcli plugins list
\`\`\`
`
  );

  writeFileSync(join(targetDir, '.xcli', 'plugins', '.gitkeep'), '');

  console.log(`Project "${name}" created!`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log(`  npm install`);
  console.log(`  npx xcli create my-plugin --template api --project`);
}
