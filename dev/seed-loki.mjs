#!/usr/bin/env node
// Seed local Loki with synthetic Cowork / Claude Code telemetry so the bundled
// dashboard renders with realistic-looking data for screenshots and demos.
//
//   docker compose up -d        # brings up Grafana + Loki
//   node dev/seed-loki.mjs      # (or: npm run seed)
//
// All data is fake. No real users, costs, or infrastructure. Safe to run
// repeatedly — Loki dedupes identical (timestamp, line) pairs.

const LOKI = process.env.LOKI_URL || 'http://localhost:3100';
const DAYS = Number(process.env.SEED_DAYS || 5); // stay under Loki's 168h reject window
const NOW = Date.now();
const WINDOW_MS = DAYS * 24 * 60 * 60 * 1000;

const USERS = ['alice@example.com', 'bob@example.com', 'carol@example.com', 'dave@example.com', 'erin@example.com'];
const MODELS = ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'];
const BUILTIN_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob', 'WebFetch', 'Agent'];
const MCP_TOOLS = [
  'Grafana__query_loki_logs',
  'Slack__slack_send_message',
  'Notion__notion-search',
  'Atlassian__getJiraIssue',
  'gandalf__semantic_search',
];

const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Weight users unevenly so the per-user panels look natural.
const pickUser = () => USERS[Math.min(USERS.length - 1, Math.floor(Math.abs(rnd(0, 1) ** 1.6) * USERS.length))];

const events = []; // { svc, ms, obj }

function push(svc, ms, obj) {
  events.push({ svc, ms, obj });
}

function modelCost(model, inTok, outTok) {
  // rough relative pricing just for plausible numbers
  const rate = model.includes('opus') ? 1.0 : model.includes('sonnet') ? 0.3 : 0.08;
  return Number((((inTok * 3 + outTok * 15) / 1_000_000) * rate * 5).toFixed(4));
}

function seedSession(svc, dayStart) {
  const user = pickUser();
  const model = pick(MODELS);
  const sessionId = 'sess-' + Math.random().toString(36).slice(2, 10);
  const start = dayStart + rnd(0, 10 * 3600 * 1000); // sometime in the day
  const turns = rndInt(3, 14);
  let t = start;

  for (let i = 0; i < turns; i++) {
    t += rnd(20_000, 240_000);

    // user prompt
    push(svc, t, {
      body: 'claude_code.user_prompt',
      attributes: { user_email: user, session_id: sessionId },
    });

    // api request
    const inTok = rndInt(800, 6000);
    const outTok = rndInt(200, 2500);
    const cacheRead = rndInt(0, 4000);
    const cacheCreate = rndInt(0, 1200);
    push(svc, t + rnd(500, 4000), {
      body: 'claude_code.api_request',
      attributes: {
        user_email: user,
        model,
        session_id: sessionId,
        cost_usd: modelCost(model, inTok, outTok),
        input_tokens: inTok,
        output_tokens: outTok,
        cache_read_tokens: cacheRead,
        cache_creation_tokens: cacheCreate,
        duration_ms: rndInt(600, 9000),
      },
    });

    // a few tool calls per turn
    const toolCalls = rndInt(0, 5);
    for (let j = 0; j < toolCalls; j++) {
      const isMcp = Math.random() < 0.3;
      const toolName = isMcp ? 'mcp_tool' : pick(BUILTIN_TOOLS);
      const success = Math.random() > 0.08;
      const attrs = {
        user_email: user,
        session_id: sessionId,
        tool_name: toolName,
        success,
        duration_ms: rndInt(20, 5000),
      };
      if (isMcp) {
        attrs.tool_parameters = JSON.stringify({ mcp_tool_name: pick(MCP_TOOLS) });
      }
      push(svc, t + rnd(4000, 8000) + j * 300, {
        body: 'claude_code.tool_result',
        attributes: attrs,
      });

      // decision events for non-read tools
      if (['Edit', 'Write', 'Bash'].includes(toolName) || isMcp) {
        const auto = Math.random() < 0.6;
        push(svc, t + rnd(3500, 7500) + j * 300, {
          body: 'claude_code.tool_decision',
          attributes: {
            user_email: user,
            session_id: sessionId,
            tool_name: toolName,
            decision: Math.random() < 0.85 ? 'accept' : 'reject',
            approval_type: auto ? 'automatic' : 'manual',
          },
        });
      }
    }
  }
}

// Generate per day.
for (let d = 0; d < DAYS; d++) {
  const dayStart = NOW - WINDOW_MS + d * 24 * 3600 * 1000;
  const coworkSessions = rndInt(6, 12);
  for (let s = 0; s < coworkSessions; s++) {
    seedSession('cowork', dayStart);
  }
  // smaller CLI (claude-code) footprint for the source-comparison panels
  const cliSessions = rndInt(2, 5);
  for (let s = 0; s < cliSessions; s++) {
    seedSession('claude-code', dayStart);
  }
}

// Group into Loki streams, sort ascending, assign unique ns timestamps.
const byStream = new Map();
for (const e of events) {
  if (!byStream.has(e.svc)) {
    byStream.set(e.svc, []);
  }
  byStream.get(e.svc).push(e);
}

const streams = [];
for (const [svc, list] of byStream) {
  list.sort((a, b) => a.ms - b.ms);
  const values = list.map((e, idx) => {
    const ns = BigInt(Math.floor(e.ms)) * 1_000_000n + BigInt(idx);
    return [ns.toString(), JSON.stringify(e.obj)];
  });
  streams.push({ stream: { service_name: svc }, values });
}

const total = streams.reduce((n, s) => n + s.values.length, 0);

async function pushChunk(stream, values) {
  const res = await fetch(`${LOKI}/loki/api/v1/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streams: [{ stream, values }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Loki push failed (${res.status}): ${body}`);
  }
}

const CHUNK = 800;
let sent = 0;
for (const s of streams) {
  for (let i = 0; i < s.values.length; i += CHUNK) {
    const slice = s.values.slice(i, i + CHUNK);
    await pushChunk(s.stream, slice);
    sent += slice.length;
    process.stdout.write(`\r  pushed ${sent}/${total} events…`);
  }
}
process.stdout.write('\n');
console.log(`Done. Seeded ${total} synthetic events across ${DAYS} days`);
console.log(`Streams: ${streams.map((s) => `${s.stream.service_name}(${s.values.length})`).join(', ')}`);
console.log('Open Grafana → Dashboards → "Cowork — Usage & Cost Analytics" and set range to "Last 7 days".');
