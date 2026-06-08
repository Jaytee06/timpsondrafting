import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);

const CONFIG = {
  webhookUrlEnv: 'VITE_CRM_WEBHOOK_URL',
  webhookApiKeyEnv: 'VITE_CRM_WEBHOOK_API_KEY',
  updateWebhookApiKeyEnv: 'VITE_CRM_UPDATE_WEBHOOK_API_KEY',
  webhookDryRunEnv: 'VITE_CRM_WEBHOOK_DRY_RUN',
  expectedWebhookUrl: 'https://app.timpsondrafting.com/api/webhooks/event',
  testLeadId: '6a1deb6701670f0ab73a56d3',
  testExternalId: 'timpson-sanity-test-001',
  ga4MeasurementId: 'G-BXQTF3KH70',
  googleAdsConfigId: 'AW-17998095514',
  googleAdsConversionSendTo: 'AW-17998095514/Izg4CNGKkIYcEJrJlIZD',
  adminEmail: 'admin@timpsondrafting.com',
  crmOrigin: 'https://app.timpsondrafting.com/',
};

const failures = [];
const warnings = [];
const passes = [];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function getEnv() {
  return {
    ...loadEnvFile(join(ROOT, '.env')),
    ...loadEnvFile(join(ROOT, '.env.local')),
    ...process.env,
  };
}

function pass(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assertIncludes(source, needle, label) {
  if (source.includes(needle)) pass(label);
  else fail(`${label}: missing ${needle}`);
}

function assertOrder(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex) pass(label);
  else fail(`${label}: expected ${first} before ${second}`);
}

function runStaticChecks() {
  const indexPath = join(ROOT, 'index.html');
  const contactFormPath = join(ROOT, 'src/components/ContactForm.tsx');
  const chatIntakePath = join(ROOT, 'src/components/ChatIntake.tsx');

  if (!existsSync(indexPath)) fail(`Missing index.html at ${indexPath}`);
  if (!existsSync(contactFormPath)) fail(`Missing ContactForm.tsx at ${contactFormPath}`);
  if (!existsSync(chatIntakePath)) fail(`Missing ChatIntake.tsx at ${chatIntakePath}`);
  if (!existsSync(indexPath) || !existsSync(contactFormPath)) return;

  const indexHtml = readFileSync(indexPath, 'utf8');
  const contactForm = readFileSync(contactFormPath, 'utf8');
  const chatIntake = existsSync(chatIntakePath) ? readFileSync(chatIntakePath, 'utf8') : '';

  assertIncludes(indexHtml, `gtag/js?id=${CONFIG.ga4MeasurementId}`, 'Google tag script loads expected GA4 ID');
  assertIncludes(indexHtml, `gtag('config', '${CONFIG.ga4MeasurementId}')`, 'index.html configures expected GA4 ID');
  assertIncludes(indexHtml, `gtag('config', '${CONFIG.googleAdsConfigId}')`, 'index.html configures expected Google Ads ID');

  assertIncludes(contactForm, `const GA4_MEASUREMENT_ID = '${CONFIG.ga4MeasurementId}'`, 'ContactForm preserves expected GA4 constant');
  assertIncludes(contactForm, `const GOOGLE_ADS_CONVERSION_ID = '${CONFIG.googleAdsConversionSendTo}'`, 'ContactForm preserves expected Ads conversion send_to');
  assertIncludes(contactForm, `window.gtag('event', 'conversion'`, 'ContactForm fires Google Ads conversion event');
  assertIncludes(contactForm, `send_to: GOOGLE_ADS_CONVERSION_ID`, 'Google Ads conversion uses configured send_to constant');
  assertIncludes(contactForm, `window.gtag('event', 'generate_lead'`, 'ContactForm fires GA4 generate_lead event');
  assertIncludes(contactForm, `send_to: GA4_MEASUREMENT_ID`, 'GA4 event uses configured measurement ID');
  assertIncludes(contactForm, `method: 'contact_form'`, 'GA4 generate_lead method is contact_form');
  assertIncludes(contactForm, `data.append('external_id', externalIdRef.current)`, 'Form payload includes stable external_id for CRM webhook lookup');
  assertIncludes(contactForm, `data.append('adminEmail', ADMIN_EMAIL)`, 'Form payload includes adminEmail');
  assertIncludes(contactForm, `data.append('gclid', trackingParams.gclid)`, 'Form payload preserves gclid');
  assertIncludes(contactForm, `data.append('gbraid', trackingParams.gbraid)`, 'Form payload preserves gbraid');
  assertIncludes(contactForm, `data.append('wbraid', trackingParams.wbraid)`, 'Form payload preserves wbraid');
  assertIncludes(contactForm, `data.append('campaignid', trackingParams.campaignid)`, 'Form payload preserves campaignid');

  assertOrder(
    contactForm,
    `if (!response.ok)`,
    `fireLeadTrackingEvents();`,
    'Conversion events fire only after CRM response success check'
  );

  assertIncludes(contactForm, `import.meta.env.VITE_CRM_WEBHOOK_URL`, 'ContactForm reads CRM webhook URL from Vite env');
  assertIncludes(contactForm, `import.meta.env.VITE_CRM_WEBHOOK_API_KEY`, 'ContactForm reads CRM webhook API key from Vite env');
  assertIncludes(contactForm, `import.meta.env.${CONFIG.webhookDryRunEnv}`, 'ContactForm reads CRM webhook dry-run flag from Vite env');
  assertIncludes(contactForm, `apiEndpoint.searchParams.set('apiKey', CRM_WEBHOOK_API_KEY)`, 'ContactForm appends API key as apiKey query param');
  assertIncludes(contactForm, `fetch(apiEndpoint.toString()`, 'ContactForm posts to env-derived API endpoint');
  assertIncludes(contactForm, `readCrmLeadId(response)`, 'ContactForm reads returned CRM lead ID for chat enrichment');
  assertIncludes(contactForm, `body.imports?.[0]?.id`, 'ContactForm reads CRM import response id for update webhook');
  assertIncludes(contactForm, `<ChatIntake`, 'ContactForm renders AI chat after successful lead submission');
  assertIncludes(contactForm, `hasEmail: Boolean(formData.email.trim())`, 'Chat form snapshot records whether email was provided');
  assertIncludes(contactForm, `hasPhone: Boolean(formData.phone.trim())`, 'Chat form snapshot records whether phone was provided');
  assertIncludes(contactForm, `hasFullName: Boolean(formData.name.trim())`, 'Chat form snapshot records whether name was provided');
  assertIncludes(contactForm, `draftLeadIdRef`, 'ContactForm creates a local draft lead ID before CRM creation');
  assertIncludes(contactForm, `externalIdRef`, 'ContactForm keeps a stable external identifier for CRM create/update');
  assertIncludes(contactForm, `buildLeadDraft(formData, trackingParams`, 'ContactForm builds a complete lead draft for AI chat');
  assertIncludes(contactForm, `missingRequiredFields.length > 0`, 'ContactForm blocks CRM auto-create until required fields are complete');
  assertIncludes(contactForm, `ensureCrmLead={ensureCrmLead}`, 'ContactForm lets chat trigger deterministic CRM create when ready');
  assertIncludes(contactForm, `onFieldPatches={handleFieldPatches}`, 'ContactForm applies AI-suggested non-contact field patches');
  assertIncludes(chatIntake, `name: string`, 'ChatIntake allows AI to patch visitor-provided name');
  if (
    contactForm.includes(`fields: {\n      email:`) ||
    contactForm.includes(`fields: {\n      phone:`) ||
    chatIntake.includes(`email: string`) ||
    chatIntake.includes(`phone: string`)
  ) {
    fail('AI lead draft/patches must not pass raw email or phone values');
  } else {
    pass('AI lead draft/patches omit raw email and phone values');
  }

  assertIncludes(chatIntake, `import.meta.env.VITE_AI_CHAT_API_URL`, 'ChatIntake reads chat API URL from Vite env');
  assertIncludes(chatIntake, `import.meta.env.VITE_COMPANY_ID`, 'ChatIntake reads company ID from Vite env');
  assertIncludes(chatIntake, `import.meta.env.${CONFIG.webhookUrlEnv}`, 'ChatIntake reads CRM webhook URL from Vite env');
  assertIncludes(chatIntake, `import.meta.env.${CONFIG.updateWebhookApiKeyEnv}`, 'ChatIntake reads CRM update webhook API key from Vite env');
  assertIncludes(chatIntake, `import.meta.env.${CONFIG.webhookDryRunEnv}`, 'ChatIntake reads CRM webhook dry-run flag from Vite env');
  assertIncludes(chatIntake, `leadId`, 'ChatIntake sends existing lead ID to chat backend');
  assertIncludes(chatIntake, `externalId`, 'ChatIntake receives stable CRM external identifier');
  assertIncludes(chatIntake, `/chat/session`, 'ChatIntake creates chat sessions through backend');
  assertIncludes(chatIntake, `data.reply || data.assistantGreeting`, 'ChatIntake renders backend-generated opening message');
  assertIncludes(chatIntake, `/chat/message`, 'ChatIntake sends messages through backend');
  assertIncludes(chatIntake, `/chat/finalize`, 'ChatIntake finalizes sessions through backend');
  assertIncludes(chatIntake, `message, leadId: activeLeadId, formSnapshot, leadDraft`, 'ChatIntake sends draft state with each chat message');
  assertIncludes(chatIntake, `reason: 'user_done', leadId: activeLeadId, formSnapshot, leadDraft`, 'ChatIntake sends draft state when finalizing chat');
  assertIncludes(chatIntake, `onFieldPatches(data.fieldPatches)`, 'ChatIntake applies backend field patch suggestions');
  assertIncludes(chatIntake, `missingRequiredFields.length > 0`, 'ChatIntake blocks CRM sync when draft required fields are incomplete');
  assertIncludes(chatIntake, `const crmLeadId = isDraftLead ? await ensureCrmLead() : activeLeadId`, 'ChatIntake creates CRM lead only after a draft is complete enough to sync');
  assertIncludes(chatIntake, `data.enrichmentPayload`, 'ChatIntake uses AI enrichment payload from backend');
  assertIncludes(chatIntake, `apiEndpoint.searchParams.set('apiKey', CRM_UPDATE_WEBHOOK_API_KEY)`, 'ChatIntake appends CRM update API key as apiKey query param');
  assertIncludes(chatIntake, `external_id: externalId`, 'ChatIntake sends external_id with CRM update payload');
  assertIncludes(chatIntake, `_id: crmLeadId`, 'ChatIntake sends returned CRM id as _id for update lookup');
  assertIncludes(chatIntake, `lastSyncedDescriptionRef.current === payload.description`, 'ChatIntake skips duplicate CRM updates for the same summary');
  assertIncludes(chatIntake, `description`, 'ChatIntake preserves description field in CRM enrichment payload type');
  assertIncludes(chatIntake, `skipCrmUpdate`, 'ChatIntake forwards CRM update skip flag to backend');
  assertIncludes(chatIntake, `bottom-5 right-5`, 'ChatIntake launcher is positioned bottom-right');
  if (chatIntake.includes('OPENAI') || chatIntake.includes('sk-')) {
    fail('ChatIntake must not expose OpenAI configuration or API keys');
  } else {
    pass('ChatIntake does not expose OpenAI API key material');
  }
  if (chatIntake.includes('console.info') || contactForm.includes('console.info')) {
    fail('Temporary CRM dry-run console logging must be removed before redeploy');
  } else {
    pass('Temporary CRM dry-run console logging is removed');
  }
}

function buildTestPayload() {
  return {
    external_id: CONFIG.testExternalId,
    test_mode: 'true',
    source: 'deployment_sanity_check',
    full_name: 'Deployment Sanity Test',
    email: 'deployment-test@timpsondrafting.com',
    phone: '4353195331',
    project_type: "Not sure - I'd like some guidance",
    project_city: 'Colorado City',
    project_state: 'AZ',
    timeline: 'No rush / just exploring',
    description: `Automated deployment sanity test for CRM external_id ${CONFIG.testExternalId}. Do not create a production lead from this payload.`,
    consent_to_text: 'false',
    website: '',
    keyword: 'sanity-test',
    gclid: 'test-gclid',
    gbraid: '',
    wbraid: '',
    campaignid: 'sanity-test-campaign',
    utm_source: 'deployment_sanity',
    utm_campaign: 'website_verification',
    utm_term: 'crm webhook test',
    adminEmail: CONFIG.adminEmail,
    landingPageUrl: 'https://timpsondrafting.com/?sanity_test=true',
    referrer: 'deployment_sanity_check',
  };
}

function encodeMultipart(fields) {
  const boundary = `----timpson-sanity-${Date.now()}`;
  const chunks = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(`--${boundary}\r\n`);
    chunks.push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
    chunks.push(`${value}\r\n`);
  }
  chunks.push(`--${boundary}--\r\n`);
  return {
    boundary,
    body: Buffer.from(chunks.join(''), 'utf8'),
  };
}

function postMultipart(url, fields) {
  const { boundary, body } = encodeMultipart(fields);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolveRequest, rejectRequest) => {
    const request = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length),
          'sc-origin': CONFIG.crmOrigin,
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolveRequest({
            statusCode: response.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    request.on('error', rejectRequest);
    request.write(body);
    request.end();
  });
}

async function runLiveApiCheck(env) {
  const liveEnabled = process.env.TIMPSON_LIVE_API_TEST === '1' || process.argv.includes('--live-api');
  if (!liveEnabled) {
    warn('Skipping live CRM webhook POST. Run with TIMPSON_LIVE_API_TEST=1 or --live-api to enable it.');
    return;
  }

  const webhookUrl = env[CONFIG.webhookUrlEnv];
  const apiKey = env[CONFIG.webhookApiKeyEnv];

  if (!webhookUrl) fail(`Missing ${CONFIG.webhookUrlEnv} in .env or .env.local`);
  if (!apiKey) fail(`Missing ${CONFIG.webhookApiKeyEnv} in .env or .env.local`);
  if (!webhookUrl || !apiKey) return;

  if (webhookUrl !== CONFIG.expectedWebhookUrl) {
    fail(`${CONFIG.webhookUrlEnv} expected ${CONFIG.expectedWebhookUrl}, got ${webhookUrl}`);
    return;
  }

  const url = new URL(webhookUrl);
  url.searchParams.set('apiKey', apiKey);

  const response = await postMultipart(url, buildTestPayload());
  if (response.statusCode < 200 || response.statusCode >= 300) {
    fail(`CRM webhook returned ${response.statusCode}: ${response.body.slice(0, 500)}`);
    return;
  }

  pass(`CRM webhook accepted test payload for external_id ${CONFIG.testExternalId} with status ${response.statusCode}`);
}

async function main() {
  const env = getEnv();
  pass(`Using landing page repo: ${ROOT}`);
  runStaticChecks();
  await runLiveApiCheck(env);

  for (const message of passes) console.log(`PASS ${message}`);
  for (const message of warnings) console.warn(`WARN ${message}`);
  for (const message of failures) console.error(`FAIL ${message}`);

  console.log(JSON.stringify({ passed: passes.length, warnings: warnings.length, failed: failures.length }, null, 2));
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
