import { Hammer } from "lucide-react";

const links = {
  "For Clients": [
    { label: "Browse Trades", href: "#trades" },
    { label: "Client Reviews", href: "#" },
  ],
  "For Tradespeople": [
    { label: "Join as a Pro", href: "#pros" },
    { label: "Success Stories", href: "#" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Contact Us", href: "#" },
  ],
};

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-[var(--surface-elevated)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <a href="#" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--gradient-amber)] text-primary-foreground">
                <Hammer className="h-4 w-4" />
              </span>
              TradeHub
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-semibold tracking-wide">{heading}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <span className="ml-140">© 2026. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
