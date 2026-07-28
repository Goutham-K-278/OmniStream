/**
 * Stress Test Panel
 * Generates synthetic telemetry and log data for pipeline validation
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Play, Zap } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  eventsGenerated: number;
  logsGenerated: number;
  duration: number;
  errors: number;
}

export default function StressTestPanel() {
  const [eventCount, setEventCount] = useState(100);
  const [logCount, setLogCount] = useState(100);
  const [burstSize, setBurstSize] = useState(50);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Stress test mutation
  const { mutate: generateData } = trpc.stressTest.generateData.useMutation({
    onSuccess: (result) => {
      setTestResult({
        eventsGenerated: result.eventsGenerated,
        logsGenerated: result.logsGenerated,
        duration: result.duration,
        errors: result.errors,
      });
      toast.success(`Generated ${result.eventsGenerated} events and ${result.logsGenerated} logs in ${result.duration}ms`);
      setIsRunning(false);
    },
    onError: (error) => {
      toast.error(`Stress test failed: ${error.message}`);
      setIsRunning(false);
    },
  });

  const handleStartTest = () => {
    setIsRunning(true);
    generateData({
      eventCount,
      logCount,
      duration: 1000,
      burstSize,
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold glow-violet">Stress Test Panel</h1>
        <p className="text-muted-foreground">Generate synthetic telemetry and log data to validate the ingestion pipeline</p>
      </div>

      {/* Warning */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium">Use with caution</p>
            <p className="text-yellow-300/80">Stress tests generate large amounts of data. Monitor your system resources during execution.</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-lg glow-cyan">Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Telemetry Events</Label>
              <span className="text-lg font-semibold text-cyan-400">{eventCount}</span>
            </div>
            <Slider
              value={[eventCount]}
              onValueChange={(value) => setEventCount(value[0])}
              min={10}
              max={10000}
              step={10}
              disabled={isRunning}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Generate between 10 and 10,000 telemetry events</p>
          </div>

          {/* Log Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Log Entries</Label>
              <span className="text-lg font-semibold text-violet-400">{logCount}</span>
            </div>
            <Slider
              value={[logCount]}
              onValueChange={(value) => setLogCount(value[0])}
              min={10}
              max={10000}
              step={10}
              disabled={isRunning}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Generate between 10 and 10,000 log entries</p>
          </div>

          {/* Burst Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Burst Size</Label>
              <span className="text-lg font-semibold text-green-400">{burstSize}</span>
            </div>
            <Slider
              value={[burstSize]}
              onValueChange={(value) => setBurstSize(value[0])}
              min={1}
              max={1000}
              step={10}
              disabled={isRunning}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Events per batch (higher = faster, more resource intensive)</p>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartTest}
            disabled={isRunning}
            className="w-full bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 font-semibold"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isRunning ? "Running Test..." : "Start Stress Test"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {testResult && (
        <Card className="bg-card border border-violet-500/30 rounded-lg shadow-lg shadow-violet-500/10 border-violet-500/30">
          <CardHeader>
            <CardTitle className="text-lg glow-violet">Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Events Generated</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {testResult.eventsGenerated.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Logs Generated</p>
                <p className="text-2xl font-bold text-violet-400">
                  {testResult.logsGenerated.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold text-green-400">
                  {testResult.duration}ms
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className={`text-2xl font-bold ${testResult.errors > 0 ? "text-red-400" : "text-green-400"}`}>
                  {testResult.errors}
                </p>
              </div>
            </div>

            {/* Throughput Stats */}
            <div className="pt-4 border-t border-violet-500/20 space-y-2">
              <p className="text-sm font-medium text-violet-300">Throughput Analysis</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Events/sec</p>
                  <p className="text-lg font-semibold text-cyan-400">
                    {(testResult.eventsGenerated / (testResult.duration / 1000)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Logs/sec</p>
                  <p className="text-lg font-semibold text-violet-400">
                    {(testResult.logsGenerated / (testResult.duration / 1000)).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="text-lg font-semibold text-green-400">
                    {(((testResult.eventsGenerated + testResult.logsGenerated - testResult.errors) / (testResult.eventsGenerated + testResult.logsGenerated)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-card border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Generates realistic telemetry events with random metrics and tags</p>
          <p>• Creates log entries with varied levels (DEBUG, INFO, WARN, ERROR)</p>
          <p>• Distributes data across multiple virtual sources</p>
          <p>• Timestamps are randomized within the last minute</p>
          <p>• Results show throughput and success metrics</p>
        </CardContent>
      </Card>
    </div>
  );
}
