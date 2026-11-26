'use client';

import { EmptyState, PageHeader, Panel } from '@/app/_ekklesia/ui';

interface UnavailableModuleProps {
  title: string;
  lede: string;
  phase: string;
  permissionHint?: string;
}

/**
 * Honest placeholder for Platform Admin modules not yet implemented.
 * Never invents metrics, logs, or integration health.
 */
export function UnavailableModule({
  title,
  lede,
  phase,
  permissionHint,
}: UnavailableModuleProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} lede={lede} />
      <Panel title="Availability">
        <EmptyState
          icon="info"
          tone="neutral"
          title="Not configured yet"
          description={`This module ships in ${phase}. No simulated operational data is shown.`}
        />
        {permissionHint ? (
          <p className="mt-4 px-4 pb-4 text-sm text-muted-foreground">
            Planned permission: <code className="text-xs">{permissionHint}</code>
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
