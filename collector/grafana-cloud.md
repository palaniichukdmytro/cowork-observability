# Profile A — Grafana Cloud

Send Cowork/Claude telemetry straight to Grafana Cloud's OTLP gateway; logs land
in your Cloud-hosted Loki. No self-managed collector.

## Client config (Cowork Monitoring settings)

| Field               | Value                                            |
| ------------------- | ------------------------------------------------ |
| OTLP endpoint       | `https://otlp-gateway-<region>.grafana.net/otlp` |
| OTLP protocol       | `http/protobuf`                                  |
| OTLP headers        | `Authorization=Basic <base64(instanceID:token)>` |
| Resource attributes | `deployment.environment=prod,team=<your-team>`   |

Generate the instance ID + token in the Grafana Cloud portal → your stack →
**OpenTelemetry** tile → _Configure_.

## Equivalent env (Claude Code CLI / managed-settings)

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-<region>.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-token>"
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
```

In the dashboard, set the `datasource` variable to your Grafana Cloud Loki.
