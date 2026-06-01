import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Dashboard } from "@/pages/dashboard";
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import { Room } from "@/pages/room";
import { Whiteboard } from "@/pages/whiteboard";
import { Files } from "@/pages/files";
import { Settings } from "@/pages/settings";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { setupApiAuth } from "@/lib/api";
import { useEffect } from "react";
import { useAuthStore } from "@/store";

const queryClient = new QueryClient();
setupApiAuth();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/room/:roomId">
        <ProtectedRoute>
          <Room />
        </ProtectedRoute>
      </Route>
      <Route path="/whiteboard/:roomId">
        <ProtectedRoute>
          <Whiteboard />
        </ProtectedRoute>
      </Route>
      <Route path="/files">
        <ProtectedRoute>
          <Files />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (!isDark && !localStorage.getItem("theme")) {
      document.documentElement.classList.add("dark"); // Default dark for app
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster position="top-right" toastOptions={{ className: 'dark:bg-surface dark:text-text dark:border dark:border-border' }} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
