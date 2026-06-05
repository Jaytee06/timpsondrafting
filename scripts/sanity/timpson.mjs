import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);

const CONFIG = {
  webhookUrlEnv: 'VITE_CRM_WEBHOOK_URL',
  webhookApiKeyEnv: 'VITE_CRM_WEBHOOK_API_KEY',
  expectedWebhookUrl: 'http://app.timpsondrafting.com/api/webhooks/event',
  testLeadId: '6a1deb6701670f0ab73a56d3',
  ga4MeasurementId: 'G-BXQTF3KH70',
  googleAdsConfigId: 'AW-17998095514',
  googleAdsConversionSendTo: 'AW-17998095514/Izg4CNGKkIYcEJrJlIZD',
  adminEmail: 'admin@timpsondrafting.com',
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

  if (!existsSync(indexPath)) fail(`Missing index.html at ${indexPath}`);
  if (!existsSync(contactFormPath)) fail(`Missing ContactForm.tsx at ${contactFormPath}`);
  if (!existsSync(indexPath) || !existsSync(contactFormPath)) return;

  const indexHtml = readFileSync(indexPath, 'utf8');
  const contactForm = readFileSync(contactFormPath, 'utf8');

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
  assertIncludes(contactForm, `apiEndpoint.searchParams.set('apiKey', CRM_WEBHOOK_API_KEY)`, 'ContactForm appends API key as apiKey query param');
  assertIncludes(contactForm, `fetch(apiEndpoint.toString()`, 'ContactForm posts to env-derived API endpoint');
}

function buildTestPayload() {
  return {
    id: CONFIG.testLeadId,
    _id: CONFIG.testLeadId,
    test_mode: 'true',
    source: 'deployment_sanity_check',
    full_name: 'Deployment Sanity Test',
    email: 'deployment-test@timpsondrafting.com',
    phone: '4353195331',
    project_type: "Not sure - I'd like some guidance",
    project_city: 'Colorado City',
    project_state: 'AZ',
    timeline: 'No rush / just exploring',
    description: `Automated deployment sanity test for existing CRM test lead ${CONFIG.testLeadId}. Do not create a production lead from this payload.`,
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

  const normalizedWebhookUrl = webhookUrl.replace(/^https:\/\//, 'http://');
  if (normalizedWebhookUrl !== CONFIG.expectedWebhookUrl) {
    fail(`${CONFIG.webhookUrlEnv} expected ${CONFIG.expectedWebhookUrl} or https equivalent, got ${webhookUrl}`);
    return;
  }

  const url = new URL(webhookUrl);
  url.searchParams.set('apiKey', apiKey);

  const response = await postMultipart(url, buildTestPayload());
  if (response.statusCode < 200 || response.statusCode >= 300) {
    fail(`CRM webhook returned ${response.statusCode}: ${response.body.slice(0, 500)}`);
    return;
  }

  pass(`CRM webhook accepted test payload for id ${CONFIG.testLeadId} with status ${response.statusCode}`);
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
