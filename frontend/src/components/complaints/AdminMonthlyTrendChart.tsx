import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  const date = new Date(Date.UTC(year, month - 1, 1));

  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function AdminMonthlyTrendChart({ accessToken }: Props) {
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
      setLoading(false);
      setError('Please sign in to view complaint trends.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardMonthlyTrend(accessToken)
      .then((data) => {
        if (!cancelled) setTrend(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load monthly complaint trends.'
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

  const chartData = [...trend]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((item) => ({
      month: formatMonth(item.year, item.month),
      submitted: item.count,
    }));

  const hasSubmissions = chartData.some(
    (item) => item.submitted > 0
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
          Complaint trends
        </h3>

        <span className="text-xs text-ink-400">
          Monthly submissions
        </span>
      </div>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading complaint trends...
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

      {!loading && !error && !hasSubmissions && (
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500 dark:bg-ink-800/50">
          No complaint submissions in this reporting period.
        </p>
      )}

      {!loading && !error && hasSubmissions && (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="adminMonthlyReal"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#3478f6"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="#3478f6"
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

              <Area
                type="monotone"
                dataKey="submitted"
                name="Submitted"
                stroke="#3478f6"
                strokeWidth={2}
                fill="url(#adminMonthlyReal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
