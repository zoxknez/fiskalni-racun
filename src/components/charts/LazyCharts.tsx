import type { ComponentProps } from 'react'
import { lazy, Suspense } from 'react'
import { ChartSkeleton } from './ChartSkeleton'

// Lazy load recharts - 275 KB bundle will only load when charts are rendered
const LazyAreaChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.AreaChart,
  }))
)

const LazyBarChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.BarChart,
  }))
)

const LazyPieChart = lazy(() =>
  import('recharts').then((module) => ({
    default: module.PieChart,
  }))
)

// Re-export other components (they'll be loaded with the chart)
export {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Wrapper components with Suspense
type AreaChartProps = ComponentProps<typeof LazyAreaChart>
type BarChartProps = ComponentProps<typeof LazyBarChart>
type PieChartProps = ComponentProps<typeof LazyPieChart>

export function AreaChart(props: AreaChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyAreaChart {...props} />
    </Suspense>
  )
}

export function BarChart(props: BarChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyBarChart {...props} />
    </Suspense>
  )
}

export function PieChart(props: PieChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyPieChart {...props} />
    </Suspense>
  )
}
