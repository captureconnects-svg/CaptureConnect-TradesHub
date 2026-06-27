import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
} from "@tanstack/react-router";

import { ThemeProvider } from "@/lib/theme";
import { CurrencyProvider } from "@/lib/currency";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { getAdminSettings } from "@/backend/admin";
import { supabase } from "@/lib/supabase";

export const SESSION_START_KEY = "tradehub-session-start";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function MaintenancePage({ siteName }: { siteName: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{siteName}</h1>
          <h2 className="text-xl font-semibold text-foreground">Under Maintenance</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            We're performing scheduled maintenance to improve your experience.
            We'll be back up and running shortly — thank you for your patience.
          </p>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>

      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();

  const [appSettings, setAppSettings] = useState<{
    maintenanceMode: boolean;
    siteName: string;
    sessionTimeoutHours: number;
  } | null>(null);

  // Ref holds latest timeout value so the interval doesn't need to re-subscribe
  const timeoutHoursRef = useRef<number | null>(null);

  function checkSessionTimeout(hours: number) {
    const sessionStart = Number(localStorage.getItem(SESSION_START_KEY) || "0");
    if (!sessionStart) return;
    const elapsed = Date.now() - sessionStart;
    const limitMs = hours * 60 * 60 * 1000;
    if (elapsed > limitMs) {
      localStorage.removeItem(SESSION_START_KEY);
      supabase.auth.signOut().then(() => {
        window.location.href = "/";
      });
    }
  }

  useEffect(() => {
    getAdminSettings().then((s) => {
      setAppSettings({
        maintenanceMode: s.maintenanceMode,
        siteName: s.siteName,
        sessionTimeoutHours: s.sessionTimeoutHours,
      });
      timeoutHoursRef.current = s.sessionTimeoutHours;
      // Immediate check on page load
      checkSessionTimeout(s.sessionTimeoutHours);
    });

    // Periodic check while user is on the page
    const interval = setInterval(() => {
      if (timeoutHoursRef.current === null) return;
      checkSessionTimeout(timeoutHoursRef.current);
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const isAdminPath = location.pathname.startsWith("/admin");

  // Suppress render until settings are fetched to prevent content flash
  if (appSettings === null) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen bg-background" />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (appSettings.maintenanceMode && !isAdminPath) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MaintenancePage siteName={appSettings.siteName} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CurrencyProvider>
          <CartProvider>
            <Outlet />
            <Toaster />
          </CartProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
