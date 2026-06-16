# Cowork Observability

Grafana dashboard for **Cowork (Claude Desktop)** usage, cost and behavioral
analytics — derived entirely from **OpenTelemetry structured log events** stored
in **Loki**. Cowork does not emit OTEL _metrics_; everything here is computed
from log events (`claude_code.api_request`, `claude_code.tool_result`,
`claude_code.tool_decision`, `claude_code.user_prompt`).

> This repo ships a **clean, reusable template**: no hardcoded users, datasources
> or org-specific values. All identifying values are parameterized.
>
> Not affiliated with Anthropic. "Claude", "Claude Code" and "Cowork" are
> referenced descriptively.

Packaged as a **Grafana app plugin** (`palanikus-coworkobservability-app`) that
bundles the dashboard. The dashboard JSON
(`src/dashboards/cowork-usage-analytics.json`) also works standalone via import.

![Cowork Observability — overview & cost analysis](https://raw.githubusercontent.com/palaniichukdmytro/cowork-observability/main/src/img/screenshot-overview.png)

## What's inside

The bundled dashboard has 9 sections:

| Section                | What it shows                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| 📊 Overview            | Total cost, active users, sessions, API requests, in/out/cache tokens, tool calls         |
| 💰 Cost Analysis       | Cost over time by user / by model, cumulative cost, cost-by-user table                    |
| 🔤 Token Usage         | Output tokens by model, API latency by model, token types over time, cache leverage       |
| 🔧 Tool Usage          | Built-in tools, MCP connector tools, tool latency, error rate, accept rate, agent latency |
| 👥 Sessions & Activity | Prompts over time, API requests over time by user                                         |
| 🏆 User Scorecard      | Per-user table: cost, tokens, requests, sessions, tool calls                              |
| 📡 Source Comparison   | CLI (`claude-code`) vs Cowork — cost, requests, active users                              |
| 📋 Logs                | Raw Cowork event stream                                                                   |
| 🔒 Approval Mode       | Auto vs manual tool-decision breakdown (security/compliance view)                         |

**Intentionally omitted:** `File Operations` and `Skills` sections from the
original dashboard — the Cowork client does not currently emit
`claude_code.file.*` or `claude_code.skill_used` events, so those panels render
empty. Re-add them once/if the collector forwards those event types.

## Requirements

- Grafana **11.0+**
- A **Loki** datasource containing Cowork log events under `{service_name="cowork"}`
  (and `{service_name="claude-code"}` for the CLI-vs-Cowork comparison).

## Data model

Each log line is JSON-parsed (`| json`). Event type is the `body` field; payload
lives in `attributes_*` fields:

| Field                                                                                          | Meaning                                                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `body`                                                                                         | event type: `claude_code.api_request` / `.tool_result` / `.tool_decision` / `.user_prompt` |
| `attributes_user_email`                                                                        | user identity                                                                              |
| `attributes_model`                                                                             | model id                                                                                   |
| `attributes_cost_usd`                                                                          | request cost                                                                               |
| `attributes_input_tokens` / `_output_tokens` / `_cache_read_tokens` / `_cache_creation_tokens` | token counts                                                                               |
| `attributes_duration_ms`                                                                       | request/tool latency                                                                       |
| `attributes_tool_name` / `attributes_tool_parameters`                                          | tool calls (`mcp_tool` carries MCP name in parameters)                                     |
| `attributes_success`                                                                           | tool success flag                                                                          |
| `attributes_decision` / `attributes_approval_type`                                             | tool-decision outcome / manual vs automatic                                                |
| `attributes_session_id`                                                                        | session grouping                                                                           |

## Variables

| Variable     | Type              | Default | Notes                                        |
| ------------ | ----------------- | ------- | -------------------------------------------- |
| `datasource` | datasource (loki) | —       | pick your Loki source on import              |
| `user_email` | textbox (regex)   | `.+`    | type an email or regex to filter; `.+` = all |
| `model`      | textbox (regex)   | `.+`    | filter by model; `.+` = all                  |

## Install

**As a Grafana app plugin** (Grafana 12.3+, ships the dashboard):

```bash
npm install
npm run build      # bundles plugin + dashboard into dist/
npm run server     # local Grafana with the plugin (docker)
```

Then enable the app in Grafana → Administration → Plugins.

**Standalone dashboard** (Grafana 11+): Dashboards → New → Import → upload
`src/dashboards/cowork-usage-analytics.json` → select your Loki datasource.

**Provisioning:** drop the JSON into a provisioning path, e.g.

```yaml
# /etc/grafana/provisioning/dashboards/cowork.yaml
apiVersion: 1
providers:
  - name: cowork-observability
    type: file
    options:
      path: /var/lib/grafana/dashboards/cowork
```

## How the data is collected

See [`collector/`](https://github.com/palaniichukdmytro/cowork-observability/tree/main/collector) for the OpenTelemetry collector pipeline that
ships Cowork/Claude Desktop telemetry into Loki.

## License

[MIT](https://github.com/palaniichukdmytro/cowork-observability/blob/main/LICENSE)
