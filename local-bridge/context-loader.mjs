import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const contextFiles = [
  'ai-context-tree/README.md',
  'ai-context-tree/SYSTEM_OVERVIEW.md',
  'ai-context-tree/STATE_MACHINE.md',
  'ai-context-tree/entities/lead.md',
  'ai-context-tree/processes/communications/README.md',
  'ai-context-tree/processes/communications/text/README.md',
  'ai-context-tree/processes/communications/email/qualification/README.md',
  'ai-context-tree/processes/communications/email/qualification/required_fields.md',
  'ai-context-tree/processes/communications/email/qualification/post_contact_required_fields.md',
  'ai-context-tree/processes/communications/email/qualification/decision_rules.md',
  'ai-context-tree/processes/communications/email/qualification/service_specific/addition.md',
  'ai-context-tree/agent_roles/qualification_agent.md',
  'ai-context-tree/agent_roles/chat_intake_style.md',
];

export const loadContextBundle = async () => {
  const files = await Promise.all(
    contextFiles.map(async (relativePath) => {
      const fullPath = path.join(repoRoot, relativePath);
      const content = await readFile(fullPath, 'utf8');
      return {
        path: relativePath,
        content,
      };
    })
  );

  return files;
};
