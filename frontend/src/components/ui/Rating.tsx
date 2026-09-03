import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/format';

interface RatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  label?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };

export function Rating({ value, onChange, size = 'md', readOnly, label }: RatingProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center" role={readOnly ? undefined : 'radiogroup'} aria-label={label || 'Rating'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange?.(n)}
            className={cn('p-0.5 transition', !readOnly && 'hover:scale-110 cursor-pointer')}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-checked={value === n}
            role={readOnly ? undefined : 'radio'}
          >
            <Star
              className={cn(
                sizeMap[size],
                n <= display ? 'fill-warning-400 text-warning-400' : 'fill-transparent text-ink-300'
              )}
            />
          </button>
        ))}
      </div>
      {value > 0 && <span className="ml-1.5 text-sm font-medium text-ink-700 dark:text-ink-200">{value.toFixed(1)}</span>}
    </div>
  );
}
