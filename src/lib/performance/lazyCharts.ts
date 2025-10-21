/**
 * Lazy Loading za Chart biblioteke
 * Optimizuje bundle size tako što učitava charts samo kada su potrebni
 */

import { lazyLibrary } from '@/lib/performance/lazyLoad'

/**
 * Lazy load Recharts biblioteke
 * Usage:
 *
 * const Charts = await lazyCharts()
 * const { BarChart, LineChart, PieChart } = Charts
 */
export const lazyCharts = lazyLibrary(() =>
  import('recharts').then((module) => ({
    BarChart: module.BarChart,
    LineChart: module.LineChart,
    PieChart: module.PieChart,
    AreaChart: module.AreaChart,
    XAxis: module.XAxis,
    YAxis: module.YAxis,
    CartesianGrid: module.CartesianGrid,
    Tooltip: module.Tooltip,
    Legend: module.Legend,
    ResponsiveContainer: module.ResponsiveContainer,
    Bar: module.Bar,
    Line: module.Line,
    Pie: module.Pie,
    Area: module.Area,
    Cell: module.Cell,
  }))
)

/**
 * Preload charts za stranice koje će ih sigurno koristiti
 * Pozovi ovo u AnalyticsPage pre nego što korisnik klikne na tab
 */
export function preloadCharts(): void {
  if (typeof window !== 'undefined') {
    // Preload tokom idle time
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        lazyCharts()
      })
    } else {
      // Fallback za Safari
      setTimeout(() => {
        lazyCharts()
      }, 1)
    }
  }
}
