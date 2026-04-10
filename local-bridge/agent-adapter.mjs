import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultCodexBinaries = [
  process.env.CODEX_BIN?.trim(),
  '/opt/homebrew/bin/codex',
  '/usr/local/bin/codex',
  'codex',
].filter(Boolean);

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

const stubReply = (job) => {
  const lastVisitorMessage = [...job.transcript].reverse().find((entry) => entry.sender === 'visitor');
  const promptHint = lastVisitorMessage?.text
    ? `You said: "${lastVisitorMessage.text}".`
    : 'I have your project inquiry.';

  return `${promptHint} A local intake agent will review the project and follow up. For a faster estimate, tell me the project location, rough size, timeline, and whether you already have sketches or plans.`;
};

const runShellCommand = (command, prompt) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finishReject = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    const finishResolve = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(value);
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      finishReject(error);
    });

    child.stdin.on('error', (error) => {
      finishReject(new Error(stderr || error.message || 'Failed to write prompt to agent command.'));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        finishReject(new Error(stderr || `Agent command exited with code ${code}`));
        return;
      }

      finishResolve(stdout.trim());
    });

    child.stdin.end(prompt, (error) => {
      if (error) {
        finishReject(new Error(stderr || error.message || 'Failed to send prompt to agent command.'));
      }
    });
  });

const commandExistsInPath = (candidate) =>
  new Promise((resolve) => {
    const child = spawn(`command -v ${shellQuote(candidate)}`, {
      shell: true,
      stdio: 'ignore',
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });
  });

const executableExists = async (candidate) => {
  if (!candidate.includes('/')) {
    return commandExistsInPath(candidate);
  }

  try {
    await access(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const buildDefaultCommand = (binaryPath) =>
  `${shellQuote(binaryPath)} exec --full-auto --ephemeral -C ${shellQuote(repoRoot)} -`;

export const resolveAgentInvocation = async () => {
  const configuredCommand = process.env.CODEX_COMMAND?.trim();
  if (configuredCommand) {
    return {
      mode: 'shell',
      command: configuredCommand,
      source: 'CODEX_COMMAND',
    };
  }

  for (const candidate of defaultCodexBinaries) {
    if (await executableExists(candidate)) {
      return {
        mode: 'shell',
        command: buildDefaultCommand(candidate),
        source: candidate === 'codex' ? 'PATH:codex' : candidate,
      };
    }
  }

  return {
    mode: 'stub',
    command: null,
    source: 'stub',
  };
};

export const generateReply = async ({ prompt, job, invocation }) => {
  if (!invocation || invocation.mode !== 'shell' || !invocation.command) {
    return stubReply(job);
  }

  const output = await runShellCommand(invocation.command, prompt);
  if (!output) {
    throw new Error('Agent command returned empty output.');
  }

  return output;
};
