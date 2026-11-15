import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  getDashboardCategoryBreakdown,
  type DashboardCategoryResponse,
} from '@/services/dashboardService';

interface Props {
  accessToken: string | null;
}

function readableCategory(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function AdminCategoryBreakdown({ accessToken }: Props) {
  const [categories, setCategories] =
    useState<DashboardCategoryResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setCategories([]);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setLoading(false);
      setError('Please sign in to view complaint categories.');

      return () => {
        cancelled = true;
      };
    }

    getDashboardCategoryBreakdown(accessToken)
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load category breakdown.'
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

  const chartData = categories
    .filter((item) => item.count > 0)
    .map((item) => ({
      id: item.category,
      name: readableCategory(item.category),
      value: item.count,
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const maxCount = Math.max(1, ...chartData.map((item) => item.value));

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Category breakdown
      </h3>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading complaint categories...
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
          No complaint categories to display.
        </p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <>
          <div
            className="mt-4 max-h-60 space-y-3 overflow-y-auto pr-2"
            tabIndex={0}
            aria-label="Complaint category counts"
          >
            {chartData.map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 break-words font-medium text-ink-600 dark:text-ink-300">
                    {item.name}
                  </span>

                  <span className="shrink-0 font-semibold text-ink-900 dark:text-ink-100">
                    {item.value}
                  </span>
                </div>

                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{
                      width: `${(item.value / maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {chartData.length > 6 && (
            <p className="mt-3 text-xs text-ink-500">
              {chartData.length} categories. Scroll inside the list to view more.
            </p>
          )}
        </>
      )}

    </Card>
  );
}
