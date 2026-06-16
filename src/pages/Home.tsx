import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { Stack, Text, TextLink } from '@grafana/ui';
import { testIds } from '../components/testIds';

function Home() {
  return (
    <PluginPage>
      <div data-testid={testIds.home.container}>
        <Stack direction="column" gap={2}>
          <Text element="p">
            Usage and cost analytics for Cowork (Claude Desktop) and Claude Code, built from OpenTelemetry log events in
            Loki. Not affiliated with Anthropic.
          </Text>

          <Text element="h4">Setup</Text>
          <Text element="p">
            1. Point Cowork / Claude at an OTLP collector — Grafana Cloud OTLP gateway or a self-hosted Grafana Alloy.
            2. Make sure the log events land in Loki under {'{service_name="cowork"}'} (and{' '}
            {'{service_name="claude-code"}'} for the CLI comparison). 3. Open the bundled dashboard from the Dashboards
            tab and select your Loki datasource.
          </Text>

          <TextLink href="https://github.com/palaniichukdmytro/cowork-observability" external>
            Documentation &amp; collector setup profiles
          </TextLink>
        </Stack>
      </div>
    </PluginPage>
  );
}

export default Home;
