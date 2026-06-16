# Collector

This directory documents how Cowork (Claude Desktop) / Claude Code telemetry is
collected and shipped into Loki as structured log events.

## Pipeline (high level)

```
Claude Desktop (Cowork) ──OTLP──▶ OpenTelemetry Collector ──▶ Loki
        │                                  │
        └─ OTEL log events                 └─ relabels service_name, routes to Loki
           (claude_code.api_request, …)       under {service_name="cowork"}
```

Cowork emits **log events** (not metrics). The collector receives them over OTLP,
labels the stream `service_name="cowork"` (and `service_name="claude-code"` for the
CLI), and forwards to Loki, where the dashboard parses them with `| json`.

## TODO — add the real config

Drop the actual collector config here, e.g. `otel-collector-config.yaml`, with:

- the **receiver** (OTLP grpc/http) Cowork points at,
- any **processors** (attributes / resource relabeling that sets `service_name`),
- the **Loki exporter** (endpoint + labels).

> Strip endpoints, tokens, tenant IDs and any internal hostnames before committing
> — keep this config as a redacted template.
