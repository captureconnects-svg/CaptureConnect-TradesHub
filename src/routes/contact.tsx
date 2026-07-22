import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { PublicMobileNav } from "@/components/trade/PublicMobileNav";
import { Mail, Clock, CheckCircle2 } from "lucide-react";
import logoImg from "@/assets/logo-withoutBranding.png";
import { useState } from "react";
import { submitContactRequest } from "@/backend/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Capture Connect" },
      {
        name: "description",
        content: "Get in touch with the TradeHub support team.",
      },
    ],
  }),
  component: ContactPage,
});

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us an email and we'll get back to you within 24 hours.",
    detail: "captureconnects@gmail.com",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Clock,
    title: "Response Time",
    description: "We aim to respond to all enquiries as quickly as possible.",
    detail: "Usually within a few hours",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
];

type FormState = "idle" | "sending" | "sent";

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [formState, setFormState] = useState<FormState>("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState("sending");
    setError(null);
    try {
      await submitContactRequest({
        fullname: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      setFormState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setFormState("idle");
    }
  };

  const isValid = form.name.trim() && form.email.trim() && form.subject.trim() && form.message.trim();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1">
            <img
              src={logoImg}
              alt="Capture Connect – TradeHub Marketplace"
              className="h-16 w-auto object-contain"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">Capture Connect</span>
              <span className="text-xs font-medium text-amber-500 tracking-wide">TradeHub Marketplace</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/reviews" className="hover:text-foreground transition-colors">Reviews</Link>
            <Link to="/help" className="hover:text-foreground transition-colors">Help Centre</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PublicMobileNav>
              <Link to="/" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Home</Link>
              <Link to="/reviews" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Reviews</Link>
              <Link to="/help" className="rounded-lg px-3 py-3 hover:bg-muted transition-colors">Help Centre</Link>
              <Link to="/contact" className="rounded-lg px-3 py-3 bg-muted font-medium">Contact</Link>
            </PublicMobileNav>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border bg-[var(--surface-elevated)] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            Get in{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              touch
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a question or need support? We're here to help.
          </p>
        </div>
      </section>

      {/* CONTACT OPTIONS */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <div
                  key={opt.title}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${opt.bg}`}>
                    <Icon className={`h-5 w-5 ${opt.color}`} />
                  </div>
                  <div className="font-semibold text-sm">{opt.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                  <span className={`text-xs font-medium ${opt.color}`}>{opt.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">Send us a message</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Fill in the form below and a member of our team will be in touch shortly.
          </p>

          {formState === "sent" ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="text-xl font-extrabold tracking-tight">Message sent!</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Thanks for reaching out. We'll get back to you at{" "}
                <span className="font-medium text-foreground">{form.email}</span> within 24 hours.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => { setForm({ name: "", email: "", subject: "", message: "" }); setFormState("idle"); }}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Jane Smith"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="subject">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="" disabled>Select a topic…</option>
                  <option value="Getting Started">Getting Started</option>
                  <option value="Payments & Billing">Payments &amp; Billing</option>
                  <option value="Reviews & Ratings">Reviews &amp; Ratings</option>
                  <option value="Account & Security">Account &amp; Security</option>
                  <option value="For Clients">For Clients</option>
                  <option value="For Tradespeople">For Tradespeople</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Describe your issue or question in as much detail as possible…"
                  required
                  rows={6}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-4 pt-1">
                <Link
                  to="/help"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to Help Centre
                </Link>
                <Button
                  type="submit"
                  disabled={!isValid || formState === "sending"}
                  className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-sm disabled:opacity-50"
                >
                  {formState === "sending" ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
