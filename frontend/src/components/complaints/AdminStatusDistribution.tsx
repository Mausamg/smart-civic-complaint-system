import { useEffect, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardStatusBreakdown,
  type DashboardStatusResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

const statusColors: Record<string, string> = {
  submitted: '#3478f6',
  underreview: '#a855f7',
  inprogress: '#f59e0b',
  resolved: '#10b981',
  rejected: '#ef4444',
  withdrawn: '#64748b',
};

function readableStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

function getStatusColor(value: string): string {
  const normalized = value.replace(/[^a-z]/gi, '').toLowerCase();
  return statusColors[normalized] ?? '#64748b';
}

export function AdminStatusDistribution({ accessToken }: Props) {
  const [statuses, setStatuses] =
    useState<DashboardStatusResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatuses([]);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setLoading(false);
      setError('Please sign in to view complaint statuses.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardStatusBreakdown(accessToken)
      .then((data) => {
        if (!cancelled) setStatuses(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load status distribution.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const chartData = statuses
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: readableStatus(item.status),
      value: item.count,
      color: getStatusColor(item.status),
    }));

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Status distribution
      </h3>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading complaint statuses...
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm text-error-600">{error}</p>

          {accessToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <p className="mt-4 text-sm text-ink-500">
          No complaint statuses to display.
        </p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-ink-600 dark:text-ink-300">
                  {item.name}
                </span>
                <span className="ml-auto font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
