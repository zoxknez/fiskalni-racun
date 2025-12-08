import type { ComponentProps, ComponentType } from 'react'
import { lazy, Suspense } from 'react'
import { ChartSkeleton } from './ChartSkeleton'

// biome-ignore lint/suspicious/noExplicitAny: Recharts types are complex and dynamic
type ChartComponentType = ComponentType<any>

// Lazy load only the needed chart containers to trim the charts chunk
const LazyAreaChart = lazy<ChartComponentType>(() =>
  import('recharts/es6/chart/AreaChart').then((module) => ({
    default: module.AreaChart,
  }))
)

const LazyBarChart = lazy<ChartComponentType>(() =>
  import('recharts/es6/chart/BarChart').then((module) => ({
    default: module.BarChart,
  }))
)

const LazyPieChart = lazy<ChartComponentType>(() =>
  import('recharts/es6/chart/PieChart').then((module) => ({
    default: module.PieChart,
  }))
)

// Re-export only the primitives we actually use, from their direct entry points
export { Area } from 'recharts/es6/cartesian/Area'
export { Bar } from 'recharts/es6/cartesian/Bar'
export { CartesianGrid } from 'recharts/es6/cartesian/CartesianGrid'
export { XAxis } from 'recharts/es6/cartesian/XAxis'
export { YAxis } from 'recharts/es6/cartesian/YAxis'
export { Cell } from 'recharts/es6/component/Cell'
export { ResponsiveContainer } from 'recharts/es6/component/ResponsiveContainer'
export { Tooltip } from 'recharts/es6/component/Tooltip'
export { Pie } from 'recharts/es6/polar/Pie'

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
