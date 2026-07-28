import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { projectProfiles } from '../../src/project-pages/project-page.data.mjs';
import { validateProjectProfiles } from '../../src/project-pages/project-page.validation.mjs';

test('production project profiles validate', () => {
  const result = validateProjectProfiles(projectProfiles);
  assert.deepEqual(result.errors, []);
});

test('unapproved or incomplete projects cannot be published', () => {
  const record = {
    enabled: true,
    editorialApproved: false,
    clientMediaApproved: false,
    slug: 'sample-project',
    title: 'Sample project',
    reviewedDate: '2026-99-99',
    projectType: 'Addition',
    locationLabel: 'Southern Utah',
    summary: 'OWNER_OR_TEAM_MUST_VERIFY',
    challenge: 'Existing conditions',
    approach: 'Drafting support',
    result: 'Drawing package',
    deliverables: [],
    images: [{ src: '/sample.jpg', alt: '', approved: false }],
  };
  const result = validateProjectProfiles([record]);
  assert.ok(result.errors.some((error) => error.includes('editorial approval')));
  assert.ok(result.errors.some((error) => error.includes('media publication permission')));
  assert.ok(result.errors.some((error) => error.includes('invalid reviewedDate')));
  assert.ok(result.errors.some((error) => error.includes('no deliverables')));
  assert.ok(result.errors.some((error) => error.includes('unapproved image')));
  assert.ok(result.errors.some((error) => error.includes('placeholder')));
});

test('project library stays out of the sitemap until proof threshold is met', () => {
  const root = process.cwd();
  const projects = readFileSync(join(root, 'dist', 'projects', 'index.html'), 'utf8');
  const sitemap = readFileSync(join(root, 'dist', 'sitemap.xml'), 'utf8');
  assert.ok(projects.includes('content="noindex,follow"'));
  assert.equal(sitemap.includes('https://timpsondrafting.com/projects/'), false);
});
