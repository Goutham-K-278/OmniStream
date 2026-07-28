import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import LiveMetrics from "@/pages/LiveMetrics";
import LogExplorer from "@/pages/LogExplorer";
import SourcesManagement from "@/pages/SourcesManagement";
import StressTestPanel from "@/pages/StressTestPanel";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      {/* Dashboard routes with sidebar layout */}
      <Route path="/dashboard">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/metrics">
        {() => (
          <DashboardLayout>
            <LiveMetrics />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/logs">
        {() => (
          <DashboardLayout>
            <LogExplorer />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/sources">
        {() => (
          <DashboardLayout>
            <SourcesManagement />
          </DashboardLayout>
        )}
      </Route>
      <Route path="/stress-test">
        {() => (
          <DashboardLayout>
            <StressTestPanel />
          </DashboardLayout>
        )}
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/">
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>

      {/* 404 fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
