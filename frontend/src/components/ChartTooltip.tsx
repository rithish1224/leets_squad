import { formatTooltipDate, isDateLike } from '../utils/dates';

const SERIES_COLORS: Record<string, string> = {
  Solved: '#00e699',
  Goal: '#94a3b8',
  count: '#00e699',
  streak: '#f59e0b',
  'Problems Solved': '#38bdf8',
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string; payload?: { rawDate?: string } }>;
  label?: string;
}

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const dateLabel = payload[0]?.payload?.rawDate ?? label;
  const formattedDate = dateLabel && isDateLike(dateLabel) ? formatTooltipDate(dateLabel) : '';

  return (
    <div className="rounded-lg px-3 py-2.5 border border-gray-700 bg-gray-900 shadow-xl">
      {formattedDate && (
        <p className="text-xs text-gray-400 mb-2 font-medium">{formattedDate}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: SERIES_COLORS[entry.name] ?? entry.color ?? '#00e699' }}
              />
              <span className="text-gray-300">{entry.name}</span>
            </span>
            <span className="font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

