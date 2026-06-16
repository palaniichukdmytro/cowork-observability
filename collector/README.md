# Collector / ingestion

The dashboard is **datasource-agnostic** — it reads whatever Loki you point the
`datasource` variable at. How Cowork/Claude telemetry _gets into_ Loki has two
supported profiles. Pick one; the dashboard is identical for both.

```
Claude Desktop (Cowork) ──OTLP──▶  [ ingestion ]  ──▶ Loki ──▶ this dashboard
   emits OTEL log events                                   {service_name="cowork"}
   (claude_code.api_request, .tool_result, .tool_decision, .user_prompt)
```

| Profile                                    | When                                             | Doc                                              |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| **A — Grafana Cloud**                      | you use Grafana Cloud's hosted Loki/OTLP gateway | [`grafana-cloud.md`](./grafana-cloud.md)         |
| **B — Self-hosted (Alloy/OTel Collector)** | you run your own collector → self-hosted Loki    | [`self-hosted-alloy.md`](./self-hosted-alloy.md) |

The Cowork client is pointed at the collector via its **Monitoring settings**
(OTLP endpoint / protocol / headers) — see
[`managed-settings.example.json`](./managed-settings.example.json) for the
managed-settings shape used to roll this out across a team.

> All endpoints/tokens below are placeholders — replace with your own.
