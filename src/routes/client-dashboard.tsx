import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/client-dashboard")({
  component: () => <Outlet />,
});
