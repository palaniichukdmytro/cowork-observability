# Changelog

## 1.0.1 (Unreleased)

- Add a sponsorship link (`info.links` → `sponsor`) and a repository Sponsor button (`.github/FUNDING.yml`).
- Release builds now produce a verifiable build-provenance attestation.

## 1.0.0

Initial release.

- Grafana **app plugin** (`palanikus-coworkobservability-app`), frontend-only (reads a Loki datasource).
- Bundles the **Cowork (Claude Desktop) — Usage & Cost Analytics** dashboard as a provisioned dashboard include — Loki / OTEL-log based, datasource-parameterized, no hardcoded users.
- Two documented ingestion profiles in `collector/`: Grafana Cloud OTLP gateway and self-hosted Grafana Alloy.
