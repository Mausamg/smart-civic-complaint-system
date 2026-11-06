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

export function StaffCategoryBreakdown({
  accessToken,
}: Props) {
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
        if (!cancelled) {
          setCategories(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load complaint categories.'
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

  const maxCount = Math.max(
    1,
    ...categories.map((item) => item.count)
  );

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        My complaint categories
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        All complaints assigned to you, grouped by category.
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm text-ink-500">
          Loading complaint categories...
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

      {!loading && !error && categories.length === 0 && (
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500 dark:bg-ink-800/50">
          No assigned complaints to display.
        </p>
      )}

      {!loading && !error && categories.length > 0 && (
        <ul className="mt-4 space-y-4">
          {categories.map((item) => (
            <li key={item.category}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="capitalize text-ink-600 dark:text-ink-300">
                  {readableCategory(item.category)}
                </span>

                <span className="font-medium text-ink-900 dark:text-ink-100">
                  {item.count}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (item.count / maxCount) * 100
                    )}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
