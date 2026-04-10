import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const handlersDir = path.join(rootDir, 'handlers');
const distDir = path.join(rootDir, 'dist');
const shouldZip = process.argv.includes('--zip');

const functions = [
  'chat-send',
  'chat-poll',
  'bridge-claim',
  'bridge-heartbeat',
  'bridge-complete',
  'bridge-fail',
];

const dependencyManifest = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));

const run = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const exists = async (targetPath) => {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
};

const copyNodeModules = async (targetDir) => {
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  if (!(await exists(nodeModulesDir))) {
    return false;
  }

  await cp(nodeModulesDir, path.join(targetDir, 'node_modules'), {
    recursive: true,
  });
  return true;
};

const packageFunction = async (name) => {
  const sourceHandler = path.join(handlersDir, `${name}.mjs`);
  const targetDir = path.join(distDir, name);

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(path.join(targetDir, 'lib'), { recursive: true });

  await cp(sourceHandler, path.join(targetDir, 'index.mjs'));
  await cp(path.join(handlersDir, 'lib'), path.join(targetDir, 'lib'), {
    recursive: true,
  });

  await writeFile(
    path.join(targetDir, 'package.json'),
    JSON.stringify(
      {
        name: `timpson-drafting-chat-${name}`,
        private: true,
        type: 'module',
        dependencies: dependencyManifest.dependencies,
      },
      null,
      2
    )
  );

  const hasNodeModules = await copyNodeModules(targetDir);
  return { targetDir, hasNodeModules };
};

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const results = [];
for (const name of functions) {
  results.push({
    name,
    ...(await packageFunction(name)),
  });
}

const allHaveNodeModules = results.every((result) => result.hasNodeModules);

if (shouldZip) {
  if (!allHaveNodeModules) {
    console.error('Missing aws/chat-mvp/node_modules. Run `npm install` in aws/chat-mvp first.');
    process.exit(1);
  }

  for (const result of results) {
    await run('zip', ['-rq', `${result.name}.zip`, '.'], result.targetDir);
  }
}

const summaryLines = [
  'Prepared Lambda bundles:',
  ...results.map((result) => `- ${path.relative(rootDir, result.targetDir)}`),
];

if (!allHaveNodeModules) {
  summaryLines.push('Node modules were not copied because aws/chat-mvp/node_modules does not exist yet.');
  summaryLines.push('Run `cd aws/chat-mvp && npm install` before uploading or zipping these bundles.');
}

if (shouldZip) {
  summaryLines.push('Created zip files inside each function directory.');
}

console.log(summaryLines.join('\n'));
