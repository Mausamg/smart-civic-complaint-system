import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardWeeklyTrend,
  type DashboardWeeklyTrendResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

function formatWeek(value: string): string {
  const date = new Date(
    `${value.slice(0, 10)}T00:00:00Z`
  );

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function StaffWeeklyTrendChart({ accessToken }: Props) {
  const [trend, setTrend] =
    useState<DashboardWeeklyTrendResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setTrend([]);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setLoading(false);
      setError('Please sign in to view weekly trends.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardWeeklyTrend(accessToken)
      .then((data) => {
        if (!cancelled) {
          setTrend(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load weekly trend.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const chartData = trend.map((item) => ({
    week: formatWeek(item.weekStart),
    count: item.count,
  }));

  const hasSubmissions = trend.some(
    (item) => item.count > 0
  );

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Weekly complaint submissions
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Complaints currently assigned to you,
        grouped by submission week.
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading weekly trend...
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm text-error-600">
            {error}
          </p>

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

      {!loading && !error && !hasSubmissions && (
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500 dark:bg-ink-800/50">
          No complaint submissions in the past six weeks.
        </p>
      )}

      {!loading && !error && hasSubmissions && (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />

              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#67718c' }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#67718c' }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  fontSize: 12,
                }}
              />

              <Bar
                dataKey="count"
                name="Submitted"
                fill="#3478f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
