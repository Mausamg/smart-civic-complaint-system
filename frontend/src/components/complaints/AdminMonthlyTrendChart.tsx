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
  getDashboardWeeklyTrend,
  getDashboardMonthlyTrend,
  getDashboardYearlyTrend,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

type Period = 'weekly' | 'monthly' | 'yearly';

interface TrendPoint {
  period: string;
  submitted: number;
}

const periods: Array<{
  value: Period;
  label: string;
  description: string;
}> = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Last 6 weeks',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Last 6 months',
  },
  {
    value: 'yearly',
    label: 'Yearly',
    description: 'Last 5 calendar years',
  },
];

function formatMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
}

function formatWeek(weekStart: string): string {
  const date = new Date(weekStart);

  return Number.isNaN(date.getTime())
    ? weekStart
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
}

export function AdminMonthlyTrendChart({
  accessToken,
}: Props) {
  const [period, setPeriod] = useState<Period>('monthly');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setTrend([]);

    if (!accessToken) {
      setError('Please sign in to view complaint trends.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    const load = async (token: string) => {
      try {
        let points: TrendPoint[];

        if (period === 'weekly') {
          const data = await getDashboardWeeklyTrend(token);

          points = data.map((item) => ({
            period: formatWeek(item.weekStart),
            submitted: item.count,
          }));
        } else if (period === 'yearly') {
          const data = await getDashboardYearlyTrend(token);

          points = data
            .sort((a, b) => a.year - b.year)
            .map((item) => ({
              period: String(item.year),
              submitted: item.count,
            }));
        } else {
          const data = await getDashboardMonthlyTrend(token);

          points = data
            .sort(
              (a, b) =>
                a.year - b.year || a.month - b.month
            )
            .map((item) => ({
              period: formatMonth(item.year, item.month),
              submitted: item.count,
            }));
        }

        if (!cancelled) setTrend(points);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load complaint trends.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load(accessToken);

    return () => {
      cancelled = true;
    };
  }, [accessToken, period, retryCount]);

  const hasSubmissions = trend.some(
    (item) => item.submitted > 0
  );

  const currentPeriod = periods.find(
    (item) => item.value === period
  )!;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
            Complaint trends
          </h3>

          <p className="mt-1 text-xs text-ink-500">
            {currentPeriod.description} · Submitted complaints
          </p>
        </div>

        <div
          role="group"
          aria-label="Complaint trend period"
          className="inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1 dark:border-ink-700 dark:bg-ink-800"
        >
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={period === item.value}
              onClick={() => setPeriod(item.value)}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' +
                (period === item.value
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-ink-700 dark:text-primary-300'
                  : 'text-ink-500 hover:text-ink-900 dark:hover:text-ink-100')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading {period} complaint trends...
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="mt-4 space-y-3">
          <p className="text-sm text-error-600">
            {error}
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryCount((n) => n + 1)}
          >
            Retry
          </Button>
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
            <AreaChart data={trend}>
              <defs>
                <linearGradient
                  id="adminTrendPeriodFill"
                  x1="0" y1="0" x2="0" y2="1"
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
                dataKey="period"
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
                fill="url(#adminTrendPeriodFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
