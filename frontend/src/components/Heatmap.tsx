import { useEffect, useMemo, useState } from 'react';
import { subDays, format, startOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

export interface HeatmapDay {
  date: string;
  count: number;
}

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const LEVEL_COLORS = [
  'rgba(255,255,255,0.06)',
  'rgba(0,230,153,0.25)',
  'rgba(0,230,153,0.45)',
  'rgba(0,230,153,0.7)',
  'rgba(0,230,153,1)',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleChange = (event: MediaQueryListEvent) => setIsSmallScreen(event.matches);

    setIsSmallScreen(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isSmallScreen;
}

export function Heatmap({ data, weeks = 52 }: { data: HeatmapDay[]; weeks?: number }) {
  const isSmallScreen = useIsSmallScreen();

  const { grid, monthLabels, total } = useMemo(() => {
    const countMap = new Map(data.map((d) => [d.date, d.count]));
    const today = new Date();
    const activeWeeks = isSmallScreen ? Math.min(weeks, 12) : weeks;
    const start = subDays(today, activeWeeks * 7 - 1);
    const weekStart = startOfWeek(start, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({
      start: weekStart,
      end: today,
    });

    const columns: Array<Array<{ date: string; count: number; level: number }>> = [];
    let currentWeek: Array<{ date: string; count: number; level: number }> = [];

    for (const day of allDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = countMap.get(dateStr) ?? 0;
      currentWeek.push({ date: dateStr, count, level: getLevel(count) });

      if (currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, level: 0 });
      }
      columns.push(currentWeek);
    }

    const months: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    columns.forEach((col, colIdx) => {
      const firstValid = col.find((d) => d.date);
      if (firstValid) {
        const month = parseISO(firstValid.date).getMonth();
        if (month !== lastMonth) {
          months.push({ label: format(parseISO(firstValid.date), 'MMM'), col: colIdx });
          lastMonth = month;
        }
      }
    });

    const total = data.reduce((s, d) => s + d.count, 0);

    return { grid: columns, monthLabels: months, total };
  }, [data, isSmallScreen, weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <div className="flex gap-1 mb-2 ml-8 h-4 relative">
          {monthLabels.map(({ label, col }) => (
            <span
              key={`${label}-${col}`}
              className="text-[10px] text-gray-500 absolute"
              style={{ left: `${col * 14}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-1">
          <div className="flex flex-col gap-[3px] mr-1 pt-0">
            {DAY_LABELS.map((label, i) => (
              <span key={i} className="text-[10px] text-gray-500 h-[11px] leading-[11px] w-6">
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    title={
                      day.date
                        ? `${day.date}: ${day.count} problem${day.count !== 1 ? 's' : ''} solved`
                        : undefined
                    }
                    className="w-[11px] h-[11px] rounded-sm transition-colors"
                    style={{ backgroundColor: LEVEL_COLORS[day.level] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            <span className="text-white font-medium">{total}</span>{' '}
            problems in {isSmallScreen ? 'the last 12 weeks' : 'the last year'}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span>Less</span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-[11px] h-[11px] rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
