/**
 * Live Metrics Chart Page
 * Displays time-series telemetry data with auto-refresh
 */

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { RefreshCw } from "lucide-react";

interface TimeSeriesData {
  timestamp: Date;
  eventCount: number;
  errorCount: number;
  throughput: number;
}

export default function LiveMetrics() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch time-series data
  const { data: timeSeriesData, isLoading, refetch } = trpc.telemetry.getTimeSeries.useQuery(
    {
      timeWindowMinutes: 60,
      bucketSizeSeconds: 60,
    },
    { refetchInterval: 10000 } // Auto-refresh every 10 seconds
  );

  // Transform data for chart
  useEffect(() => {
    if (timeSeriesData?.timeSeries) {
      const transformed = timeSeriesData.timeSeries.map((point: TimeSeriesData) => ({
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
        eventCount: point.eventCount,
        errorCount: point.errorCount,
        throughput: point.throughput,
      }));
      setChartData(transformed);
    }
  }, [timeSeriesData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold glow-cyan">Live Metrics</h1>
          <p className="text-muted-foreground">Real-time telemetry throughput over the last 60 minutes</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="border-cyan-500/30 hover:bg-cyan-500/10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Area Chart - Throughput */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-lg glow-cyan">Event Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 211, 238, 0.1)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="rgba(148, 163, 184, 0.5)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="rgba(148, 163, 184, 0.5)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "#22d3ee" }}
                />
                <Area
                  type="monotone"
                  dataKey="throughput"
                  stroke="#22d3ee"
                  fillOpacity={1}
                  fill="url(#colorThroughput)"
                  name="Events/sec"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Chart - Events vs Errors */}
      <Card className="bg-card border border-violet-500/30 rounded-lg shadow-lg shadow-violet-500/10 border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-lg glow-violet">Events vs Errors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 139, 250, 0.1)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="rgba(148, 163, 184, 0.5)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="rgba(148, 163, 184, 0.5)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(167, 139, 250, 0.3)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "#a78bfa" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="eventCount"
                  stroke="#22d3ee"
                  dot={false}
                  strokeWidth={2}
                  name="Total Events"
                />
                <Line
                  type="monotone"
                  dataKey="errorCount"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                  name="Errors"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Info */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-sm">Chart Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Charts auto-refresh every 10 seconds</p>
          <p>• Displays data from the last 60 minutes</p>
          <p>• Each data point represents 1-minute aggregation</p>
          <p>• Hover over the chart to see detailed values</p>
        </CardContent>
      </Card>
    </div>
  );
}
