/**
 * Sources Management Page
 * Lists all unique data sources with statistics
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Server, Clock } from "lucide-react";

export default function SourcesManagement() {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Fetch all sources
  const { data: sourcesData, isLoading: sourcesLoading } = trpc.sources.getSources.useQuery(
    undefined,
    { refetchInterval: 10000 } // Auto-refresh every 10 seconds
  );

  // Fetch stats for selected source
  const { data: sourceStats, isLoading: statsLoading } = trpc.sources.getStats.useQuery(
    { sourceName: selectedSource || "" },
    { enabled: !!selectedSource, refetchInterval: 5000 }
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold glow-green">Sources Management</h1>
        <p className="text-muted-foreground">Monitor all connected data sources</p>
      </div>

      {/* Sources List */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="w-5 h-5 text-green-400" />
            Connected Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sourcesData?.sources && sourcesData.sources.length > 0 ? (
            <div className="space-y-2">
              {sourcesData.sources.map((source) => (
                <div
                  key={source.name}
                  onClick={() => setSelectedSource(source.name)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSource === source.name
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-green-500/20 hover:border-green-500/40 bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-green-400">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.telemetryCount} events • Last seen: {new Date(source.lastSeen).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No sources connected
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Details */}
      {selectedSource && (
        <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-violet-500/30">
          <CardHeader>
            <CardTitle className="text-lg glow-violet">
              {selectedSource} - Detailed Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            ) : sourceStats?.stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {sourceStats.stats.totalEvents?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold text-violet-400">
                    {sourceStats.stats.totalLogs?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last Event
                  </p>
                  <p className="text-lg font-medium text-green-400">
                    {sourceStats.stats.lastEventTime ? new Date(sourceStats.stats.lastEventTime).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Event Rate</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {sourceStats.stats.eventRate?.toFixed(2) || 0} evt/min
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No data available for this source
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Total connected sources: {sourcesData?.count || 0}</p>
          <p>• Click on a source to view detailed statistics</p>
          <p>• Last seen timestamp indicates the most recent activity</p>
          <p>• Event rate is calculated per minute</p>
        </CardContent>
      </Card>
    </div>
  );
}
