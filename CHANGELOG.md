# Changelog

## 1.0.0 (Unreleased)

Initial release.

- Grafana **app plugin** (`palanikus-coworkobservability-app`), frontend-only (reads a Loki datasource).
- Bundles the **Cowork (Claude Desktop) — Usage & Cost Analytics** dashboard as a provisioned dashboard include — Loki / OTEL-log based, datasource-parameterized, no hardcoded users.
- Two documented ingestion profiles in `collector/`: Grafana Cloud OTLP gateway and self-hosted Grafana Alloy.
