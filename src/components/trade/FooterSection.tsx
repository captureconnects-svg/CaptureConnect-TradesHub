import { Hammer } from "lucide-react";
import { Link } from "@tanstack/react-router";

type FooterLink = { label: string; to: string; hash?: string };

const staticLinks: Record<string, FooterLink[]> = {
  "For Clients": [
    { label: "Browse Trades", to: "/client-login-signup" },
    { label: "Client Reviews", to: "/reviews" },
  ],
  "For Tradespeople": [
    { label: "Join as a Pro", to: "/pro-login-signup" },
    { label: "Success Stories", to: "/reviews", hash: "testimonials" },
  ],
};

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-[var(--surface-elevated)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--gradient-amber)] text-primary-foreground">
                <Hammer className="h-4 w-4" />
              </span>
              Capture Connect
            </Link>
          </div>

          {/* Link columns */}
          {Object.entries(staticLinks).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-semibold tracking-wide">{heading}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.hash ? `${item.to}#${item.hash}` : item.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Support column */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide">Support</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help Centre
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <span className="ml-140">© 2026. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
