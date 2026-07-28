/**
 * Dashboard Home Page
 * Displays key telemetry metrics and system overview
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, Zap, TrendingUp } from "lucide-react";

interface MetricData {
  totalEvents: number;
  eventsPerMinute: number;
  errorRate: number;
  activeSources: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch telemetry stats
  const { data: telemetryStats, isLoading: telemetryLoading } = trpc.telemetry.getStats.useQuery(
    { timeWindowMinutes: 60 },
    { refetchInterval: 10000 } // Auto-refresh every 10 seconds
  );

  // Fetch log stats
  const { data: logStats, isLoading: logLoading } = trpc.logs.getStats.useQuery(
    { timeWindowMinutes: 60 },
    { refetchInterval: 10000 }
  );

  // Update metrics when data arrives
  useEffect(() => {
    if (telemetryStats?.stats) {
      setMetrics({
        totalEvents: telemetryStats.stats.totalEvents,
        eventsPerMinute: telemetryStats.stats.eventsPerMinute,
        errorRate: logStats?.stats?.totalLogs ? (logStats.stats.errorCount / logStats.stats.totalLogs) * 100 : 0,
        activeSources: telemetryStats.stats.activeSources,
      });
      setLoading(false);
    }
  }, [telemetryStats, logStats]);

  const MetricCard = ({
    title,
    value,
    unit,
    icon: Icon,
    trend,
    color,
  }: {
    title: string;
    value: number | string;
    unit?: string;
    icon: React.ReactNode;
    trend?: string;
    color: "cyan" | "violet" | "green" | "red";
  }) => {
    const colorClasses = {
      cyan: "border-cyan-500/30 shadow-cyan-500/10",
      violet: "border-violet-500/30 shadow-violet-500/10",
      green: "border-green-500/30 shadow-green-500/10",
      red: "border-red-500/30 shadow-red-500/10",
    };

    const textColorClasses = {
      cyan: "text-cyan-400",
      violet: "text-violet-400",
      green: "text-green-400",
      red: "text-red-400",
    };

    return (
      <Card className={`metric-card border ${colorClasses[color]} bg-card/50 backdrop-blur`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <span className={textColorClasses[color]}>{Icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${textColorClasses[color]}`}>
                  {typeof value === "number" ? value.toLocaleString() : value}
                </span>
                {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              </div>
              {trend && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {trend}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold glow-cyan">OmniStream Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time telemetry and log ingestion platform
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Events"
          value={metrics?.totalEvents || 0}
          icon={<Activity className="w-4 h-4" />}
          color="cyan"
          trend="Last 60 minutes"
        />
        <MetricCard
          title="Events/Min"
          value={metrics?.eventsPerMinute || 0}
          unit="evt/min"
          icon={<Zap className="w-4 h-4" />}
          color="violet"
          trend="Current rate"
        />
        <MetricCard
          title="Error Rate"
          value={metrics?.errorRate ? metrics.errorRate.toFixed(2) : "0"}
          unit="%"
          icon={<AlertCircle className="w-4 h-4" />}
          color="red"
          trend="Last 60 minutes"
        />
        <MetricCard
          title="Active Sources"
          value={metrics?.activeSources || 0}
          icon={<Activity className="w-4 h-4" />}
          color="green"
          trend="Connected"
        />
      </div>

      {/* System Status */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-lg glow-cyan">System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Telemetry Service</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Log Service</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Database</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">Connected</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="bg-card border border-violet-500/30 rounded-lg shadow-lg shadow-violet-500/10 border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-lg glow-violet">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate to Live Metrics, Log Explorer, Sources Management, and Stress Test Panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
