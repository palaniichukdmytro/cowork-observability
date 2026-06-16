# Profile B — Self-hosted (Grafana Alloy / OTel Collector)

Run your own collector that accepts OTLP from Cowork/Claude and forwards log
events to your self-hosted Loki. Below is a minimal **Grafana Alloy** config
(`config.alloy`) — receive OTLP on gRPC `:4317` / HTTP `:4318`, export logs to
Loki (and traces to Tempo, optional).

```alloy
otelcol.receiver.otlp "otlp_receiver" {
  grpc {
    endpoint = "0.0.0.0:4317"
  }
  http {
    endpoint = "0.0.0.0:4318"
  }

  output {
    logs   = [otelcol.exporter.otlp.loki_logs.input]
    traces = [otelcol.exporter.otlp.tempo.input]   // optional
  }
}

// Cowork log events -> Loki (native OTLP ingestion)
otelcol.exporter.otlp "loki_logs" {
  client {
    endpoint = "<LOKI_HOST>:3100"   // e.g. loki:3100
    tls {
      insecure = true               // set false + configure certs in prod
    }
  }
}

// optional: traces -> Tempo
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "<TEMPO_HOST>:4317"
    tls { insecure = true }
  }
}
```

Run it (docker):

```yaml
# docker-compose.yaml (excerpt)
services:
  alloy:
    image: grafana/alloy:latest
    command:
      - run
      - /etc/alloy/config.alloy
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy
    ports:
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
      - '12345:12345' # Alloy UI
```

## Client config (Cowork Monitoring settings / env)

Point Cowork at your collector:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT="http://<COLLECTOR_HOST>:4317"
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
export OTEL_LOGS_EXPORT_INTERVAL=5000
export OTEL_LOG_TOOL_DETAILS=1
```

Then set the dashboard `datasource` variable to your self-hosted Loki.

> Loki must have OTLP ingestion enabled (`/otlp/v1/logs`) and a label/structured-
> metadata setup that preserves `service_name` and the `attributes_*` fields the
> dashboard parses with `| json`.
