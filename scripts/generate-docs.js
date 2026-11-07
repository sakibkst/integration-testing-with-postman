// Generates API documentation from the Postman collection.
//
//   npm test          # run the flow once (writes Reports/newman-report.json)
//   npm run docs      # 1) saves each real response into the collection as a Postman example
//                     # 2) renders docs/API_DOCUMENTATION.md from the collection
//
// Step 1 is skipped when no Newman JSON report exists; the Markdown is then rendered with
// whatever examples are already stored in the collection.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const collectionPath = path.join(root, 'postman', 'DMoney-E2E.postman_collection.json');
const reportPath = path.join(root, 'Reports', 'newman-report.json');
const docPath = path.join(root, 'docs', 'API_DOCUMENTATION.md');

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const flatItems = collection.item.flatMap((folder) => folder.item.map((it) => ({ folder, it })));

// ── Step 1: capture real responses as Postman examples ──────────────────────────────
const SECRET_KEYS = { token: '<jwt>', password: '<password-hash-redacted>' };
const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, k in SECRET_KEYS && v ? SECRET_KEYS[k] : redact(v)])
    );
  }
  return value;
};

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const byName = new Map(report.run.executions.map((e) => [e.item.name, e]));
  let captured = 0;
  for (const { it } of flatItems) {
    const exec = byName.get(it.name);
    if (!exec || !exec.response) continue;
    const raw = Buffer.from(exec.response.stream || []).toString('utf8');
    let body = raw;
    try {
      body = JSON.stringify(redact(JSON.parse(raw)), null, 2);
    } catch (_) { /* not JSON: keep as is */ }
    it.response = [
      {
        name: `${exec.response.code} ${exec.response.status}`,
        originalRequest: it.request,
        status: exec.response.status,
        code: exec.response.code,
        _postman_previewlanguage: 'json',
        header: [{ key: 'Content-Type', value: 'application/json; charset=utf-8' }],
        cookie: [],
        body,
      },
    ];
    captured += 1;
  }
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
  console.log(`Saved ${captured} response examples into the collection`);
}

// ── Step 2: render Markdown ─────────────────────────────────────────────────────────
const expectedStatus = (it) => {
  const test = it.event.find((e) => e.listen === 'test').script.exec.join('\n');
  const m = test.match(/have\.status\((\d+)\)/);
  return m ? m[1] : '-';
};
const isNegative = (it) => /\(negative\)/i.test(it.name);
// GitHub heading anchors: lowercase, drop punctuation, every space becomes a hyphen (no collapsing)
const anchor = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/ /g, '-');

const out = [];
out.push('# DMoney Transaction API — Test Flow Documentation', '');
out.push(
  'Generated from [`postman/DMoney-E2E.postman_collection.json`](../postman/DMoney-E2E.postman_collection.json) by `npm run docs`. ' +
    'It documents every endpoint exercised by the collection, with the request that is sent and a real response captured from a Newman run ' +
    '(JWTs and password hashes are redacted).',
  ''
);
out.push('Full interactive API reference (Swagger UI, served by the API itself):', '');
out.push('- User API: `http://localhost:5000/api-docs/user`', '- Transaction API: `http://localhost:5000/api-docs/transaction`', '');

out.push('## Conventions', '');
out.push('| Item | Value |', '|---|---|');
out.push('| Base URL | `{{base_url}}` (default `http://localhost:5000`) |');
out.push('| Auth header | `Authorization: Bearer <jwt>` |');
out.push('| Partner key | `X-AUTH-SECRET-KEY: {{partner_key}}` — must equal the API\'s `PARTNER_KEY`; required on every endpoint except register, login, verify-otp and the `/user/search/*` lookups |');
out.push('| Identifiers | Accounts are identified by **phone number** (the SYSTEM account is the literal string `SYSTEM`) |');
out.push('| Login | Admin/SYSTEM get a JWT from `/user/login`. Customer/Agent/Merchant get `otpRequired: true`, then exchange the OTP at `/user/verify-otp` |');
out.push('| `208 Already Reported` | Business-rule soft failure (duplicate user, insufficient balance, limit exceeded) — not a transport error |', '');

out.push('## Test cases at a glance', '');
out.push('| ID | Folder | Test case | Type | Expected status |', '|---|---|---|---|---|');
for (const { folder, it } of flatItems) {
  const [id, ...rest] = it.name.split(' - ');
  const title = rest.join(' - ').replace(/ \(negative\)$/i, '');
  out.push(`| [${id}](#${anchor(it.name)}) | ${folder.name} | ${title} | ${isNegative(it) ? 'Negative' : 'Positive'} | ${expectedStatus(it)} |`);
}
out.push('');

out.push('## Collection variables', '');
out.push('| Variable | Source | Purpose |', '|---|---|---|');
out.push('| `base_url`, `partner_key`, `default_otp`, `admin_*`, `system_*`, `user_password` | Environment (`postman/DMoney-Local.postman_environment.json`, overridable via `.env`) | Where the API runs and which seeded accounts to use |');
out.push('| `*_email`, `*_phone`, `*_nid` | Generated in TC01\'s pre-request script | Unique users per run, so the flow can be repeated |');
out.push('| `*_id`, `*_token` | Set by test scripts | Passed from one request to the next |');
out.push('| `deposit_commission_rate`, `sendmoney_fee`, `withdraw_fee_rate`, `withdraw_min_fee`, `payment_fee_rate`, `payment_min_fee` | Collection | Expected fee/commission rules from the BRD (§9) |', '');

const headerTable = (headers) => {
  const rows = (headers || []).filter((h) => !h.disabled);
  if (!rows.length) return [];
  return ['| Header | Value |', '|---|---|', ...rows.map((h) => `| \`${h.key}\` | \`${h.value}\` |`), ''];
};

for (const folder of collection.item) {
  out.push(`## ${folder.name}`, '');
  if (folder.description) out.push(folder.description, '');
  for (const it of folder.item) {
    const r = it.request;
    out.push(`### ${it.name}`, '');
    out.push(r.description || '', '');
    out.push(`**Request** — \`${r.method} ${r.url.raw}\``, '');
    out.push(...headerTable(r.header));
    if (r.body && r.body.raw) out.push('```json', r.body.raw, '```', '');
    const ex = (it.response || [])[0];
    if (ex) {
      out.push(`**Example response — ${ex.code} ${ex.status}**`, '', '```json', ex.body, '```', '');
    }
  }
}

fs.mkdirSync(path.dirname(docPath), { recursive: true });
fs.writeFileSync(docPath, out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log(`Wrote ${path.relative(root, docPath)} (${flatItems.length} test cases)`);
