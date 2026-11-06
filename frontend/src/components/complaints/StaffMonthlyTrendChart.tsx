import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardMonthlyTrend,
  type DashboardMonthlyTrendResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

function formatMonth(year: number, month: number): string {
  return new Date(
    Date.UTC(year, month - 1, 1)
  ).toLocaleDateString(undefined, {
    month: 'short',
    timeZone: 'UTC',
  });
}

export function StaffMonthlyTrendChart({
  accessToken,
}: Props) {
  const [trend, setTrend] =
    useState<DashboardMonthlyTrendResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setTrend([]);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setError('Please sign in to view monthly trends.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getDashboardMonthlyTrend(accessToken)
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
              : 'Unable to load monthly trends.'
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
    month: formatMonth(item.year, item.month),
    count: item.count,
  }));

  const hasSubmissions = trend.some(
    (item) => item.count > 0
  );

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Monthly complaint submissions
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        Assigned complaints submitted over the last six months.
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading monthly trend...
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
          No complaint submissions in the last six months.
        </p>
      )}

      {!loading && !error && hasSubmissions && (
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="staffMonthlyReal"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#10b981"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="#10b981"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#67718c' }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                width={25}
                tick={{ fontSize: 10, fill: '#67718c' }}
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

              <Area
                type="monotone"
                dataKey="count"
                name="Submitted"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#staffMonthlyReal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
