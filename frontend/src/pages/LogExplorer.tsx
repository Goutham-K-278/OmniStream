/**
 * Log Explorer Page
 * Displays paginated, filterable logs with search and time-range filtering
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { LogLevel } from "@shared/types";

export default function LogExplorer() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel[]>([]);

  // Fetch logs
  const { data: logsData, isLoading } = trpc.logs.getLogs.useQuery(
    {
      page,
      pageSize,
      search: search || undefined,
      level: levelFilter.length > 0 ? levelFilter : undefined,
    },
    { refetchInterval: 5000 } // Auto-refresh every 5 seconds
  );

  const getLevelBadgeClass = (level: LogLevel) => {
    switch (level) {
      case "DEBUG":
        return "badge-debug";
      case "INFO":
        return "badge-info";
      case "WARN":
        return "badge-warn";
      case "ERROR":
        return "badge-error";
      default:
        return "badge-info";
    }
  };

  const handleLevelToggle = (level: LogLevel) => {
    setLevelFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold glow-violet">Log Explorer</h1>
        <p className="text-muted-foreground">Search and filter logs with real-time updates</p>
      </div>

      {/* Filters */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs by message..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-cyan-500/30 bg-card/50"
            />
          </div>

          {/* Level Filter */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Log Level</p>
            <div className="flex flex-wrap gap-2">
              {["DEBUG", "INFO", "WARN", "ERROR"].map((level) => (
                <Button
                  key={level}
                  variant={levelFilter.includes(level as LogLevel) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLevelToggle(level as LogLevel)}
                  className={`${
                    levelFilter.includes(level as LogLevel)
                      ? "bg-cyan-500/20 border-cyan-500/50"
                      : "border-cyan-500/30 hover:bg-cyan-500/10"
                  }`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-sm">
            Logs {logsData && `(${logsData.total} total)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logsData?.items && logsData.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-500/20 hover:bg-cyan-500/5">
                      <TableHead className="text-cyan-400">Level</TableHead>
                      <TableHead className="text-cyan-400">Message</TableHead>
                      <TableHead className="text-cyan-400">Source</TableHead>
                      <TableHead className="text-cyan-400">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.items.map((log, idx) => (
                      <TableRow
                        key={idx}
                        className="border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                      >
                        <TableCell>
                          <span className={getLevelBadgeClass(log.level)}>
                            {log.level}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.source}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-cyan-500/20">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(logsData.total / pageSize)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!logsData.hasMore}
                    className="border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
