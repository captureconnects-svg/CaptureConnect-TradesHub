import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Hammer,
  Search,
  BookOpen,
  CreditCard,
  Star,
  Shield,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Centre — Capture Connect" },
      {
        name: "description",
        content: "Find answers to common questions about TradeHub for clients and tradespeople.",
      },
    ],
  }),
  component: HelpPage,
});

type CategoryKey =
  | "Getting Started"
  | "Payments & Billing"
  | "Reviews & Ratings"
  | "Account & Security"
  | "For Clients"
  | "For Tradespeople";

interface Category {
  key: CategoryKey;
  icon: LucideIcon;
  description: string;
  color: string;
  bg: string;
}

const CATEGORIES: Category[] = [
  {
    key: "Getting Started",
    icon: BookOpen,
    description: "New to TradeHub? Learn the basics.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    key: "Payments & Billing",
    icon: CreditCard,
    description: "Invoices, payouts, and transaction queries.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "Reviews & Ratings",
    icon: Star,
    description: "How reviews work for clients and pros.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    key: "Account & Security",
    icon: Shield,
    description: "Passwords, verification, and privacy.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    key: "For Clients",
    icon: User,
    description: "Booking jobs, managing projects, and more.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    key: "For Tradespeople",
    icon: Briefcase,
    description: "Profile setup, leads, and earnings.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const FAQS: Record<CategoryKey, { q: string; a: string }[]> = {
  "Getting Started": [
    {
      q: "What is TradeHub?",
      a: "TradeHub is a marketplace that connects clients with verified, skilled tradespeople. Whether you need a plumber, electrician, builder, or any other tradesperson, TradeHub makes it easy to find, compare, and book trusted professionals.",
    },
    {
      q: "How do I create an account?",
      a: "Click 'Get Started' or 'Join as a Pro' on the homepage. You can sign up with your email address or via a social login. You'll receive a confirmation email — click the link inside to verify your account before you can start using the platform.",
    },
    {
      q: "What types of tradespeople are on TradeHub?",
      a: "TradeHub hosts a wide range of skilled tradespeople including plumbers, electricians, builders, carpenters, painters, decorators, roofers, landscapers, and more. All pros are verified before listing their services.",
    },
    {
      q: "Is TradeHub available in my area?",
      a: "TradeHub operates nationally. When browsing tradespeople you can filter by location to find professionals near you. Coverage continues to expand, so if your area has limited listings, check back regularly.",
    },
    {
      q: "How do I navigate the platform?",
      a: "Once logged in, use the dashboard sidebar to access bookings, messages, your profile, and settings. From the homepage you can browse tradespeople by category, view their profiles, and send booking requests.",
    },
  ],
  "Payments & Billing": [
    {
      q: "What payment methods are accepted?",
      a: "TradeHub accepts all major debit and credit cards (Visa, Mastercard, Amex) as well as bank transfers. Payment details are encrypted and processed securely — we never store your full card details.",
    },
    {
      q: "When is payment taken?",
      a: "Payment is held securely once a booking is confirmed. Funds are only released to the tradesperson after the job is marked as complete and you confirm you're satisfied with the work.",
    },
    {
      q: "How do tradespeople receive their earnings?",
      a: "Once a job is marked complete and confirmed by the client, the tradesperson's earnings are transferred to their connected bank account. Payouts typically arrive within 3–5 business days.",
    },
    {
      q: "Are there any hidden fees?",
      a: "Signing up and browsing is always free. A small platform fee is applied when a job is completed and payment is processed. This fee is displayed transparently at checkout before you confirm any payment.",
    },
    {
      q: "How do I get a refund?",
      a: "If a job is cancelled before work begins, payment is refunded automatically. For disputes after work has started, contact our support team and we'll investigate to reach a fair resolution.",
    },
    {
      q: "Can I get an invoice for a completed job?",
      a: "Yes. Once a job is complete you can download a VAT invoice from the Transactions section of your dashboard. This is available for both clients and tradespeople.",
    },
  ],
  "Reviews & Ratings": [
    {
      q: "How are reviews verified?",
      a: "Only clients who have completed and paid for a job through TradeHub can leave a review. This ensures all reviews are genuine and based on a real experience, keeping the platform trustworthy for everyone.",
    },
    {
      q: "When can I leave a review?",
      a: "After a job is marked as complete you'll be prompted to leave a star rating and written review. You have up to 30 days after completion to submit your review.",
    },
    {
      q: "How is a tradesperson's star rating calculated?",
      a: "A tradesperson's overall star rating is the average of all verified client reviews. The rating is updated in real time each time a new review is submitted.",
    },
    {
      q: "Can a tradesperson remove a negative review?",
      a: "Tradespeople cannot remove reviews. However, if you believe a review violates our community guidelines (e.g. it is abusive or fraudulent), you can report it and our team will investigate.",
    },
    {
      q: "Can I respond to a review left for me?",
      a: "Yes — tradespeople can leave a professional public response to any review. This is a great opportunity to thank clients and, where necessary, address any concerns raised.",
    },
  ],
  "Account & Security": [
    {
      q: "How do I reset my password?",
      a: "Click 'Forgot password' on the login screen and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.",
    },
    {
      q: "How do I verify my email address?",
      a: "After signing up, a verification email is sent to the address you registered with. Click the link inside to confirm your account. If you didn't receive it, check your spam folder or request a new one from the login screen.",
    },
    {
      q: "How is my personal data protected?",
      a: "TradeHub uses industry-standard encryption and stores data securely. We never sell your personal data to third parties. You can request a copy of your data or ask for it to be deleted at any time by contacting our support team.",
    },
    {
      q: "Can I delete my account?",
      a: "Yes. Go to Account Settings in your dashboard and select 'Delete Account'. This action is permanent and will remove all your data from the platform. Any pending payments will be settled before deletion.",
    },
    {
      q: "How do I change my email address?",
      a: "Go to Account Settings and update your email. A confirmation link will be sent to your new address — click it to complete the change. Your old email will stop working for login immediately.",
    },
  ],
  "For Clients": [
    {
      q: "How do I book a tradesperson?",
      a: "Browse available tradespeople from your client dashboard, view their profiles and portfolios, then send a booking request. Once the tradesperson accepts, you can agree on a start date and scope of work.",
    },
    {
      q: "Is there a fee to use TradeHub as a client?",
      a: "Signing up and browsing tradespeople is completely free. A small service fee is only applied when a job is completed and payment is processed through the platform.",
    },
    {
      q: "Can I book more than one tradesperson?",
      a: "Yes, you can have multiple active bookings at once. Manage all your jobs from the Bookings section of your client dashboard.",
    },
    {
      q: "Can I leave a review after the job is done?",
      a: "Yes. After a job is marked as complete, you'll be prompted to leave a star rating and written review for the tradesperson. Reviews help the community make informed decisions.",
    },
    {
      q: "What if I'm unhappy with the work?",
      a: "Reach out to the tradesperson first to resolve the issue. If you cannot reach an agreement, contact our support team and we'll mediate to find a fair resolution. Payment is held securely until you confirm the work is satisfactory.",
    },
    {
      q: "How do I cancel a booking?",
      a: "Go to the Bookings section of your dashboard and select the booking you'd like to cancel. Cancellation policies vary depending on how close to the job start date you cancel. Check the tradesperson's profile for their specific policy.",
    },
  ],
  "For Tradespeople": [
    {
      q: "How do I set up my pro profile?",
      a: "After signing up, head to your Pro Dashboard and complete your profile — add a bio, your trade specialities, availability (work days), and portfolio images or videos. A complete profile attracts significantly more clients.",
    },
    {
      q: "How does my availability work?",
      a: "In your dashboard settings you can set your available work days and times. Clients will see your availability when booking, so keeping this up to date helps you receive relevant enquiries only.",
    },
    {
      q: "How do I build my portfolio?",
      a: "Go to the Portfolio section in your Pro Dashboard and upload photos or videos of completed work. A strong portfolio significantly increases your chances of winning jobs — aim for at least 5 examples of your best work.",
    },
    {
      q: "How do I get my first client?",
      a: "Complete your profile fully, upload portfolio images, and set your availability. Clients searching your trade category will see your listing. Responding quickly to enquiries and keeping your ratings high will boost your visibility over time.",
    },
    {
      q: "Can I set my own rates?",
      a: "Yes. You set your own pricing and can update it at any time from your Pro Dashboard. You can charge per hour, per day, or quote per job depending on the type of work.",
    },
    {
      q: "What happens if a client cancels?",
      a: "If a client cancels within your cancellation window, you may be entitled to a cancellation fee as set in your profile. Our support team can help if you believe a cancellation was unfair.",
    },
  ],
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left text-sm font-medium hover:text-amber-500 transition-colors"
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function CategoryDetail({
  category,
  onBack,
}: {
  category: Category;
  onBack: () => void;
}) {
  const Icon = category.icon;
  const faqs = FAQS[category.key];
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Breadcrumb / back */}
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All topics
        </button>

        {/* Category header */}
        <div className="mb-8 flex items-center gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${category.bg}`}>
            <Icon className={`h-6 w-6 ${category.color}`} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{category.key}</h2>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="rounded-2xl border border-border bg-card px-6">
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HelpPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) setSelectedCategory(null);
  };

  const allFaqSections = Object.entries(FAQS) as [CategoryKey, { q: string; a: string }[]][];

  const searchResults = allFaqSections
    .map(([section, items]) => ({
      section,
      items: items.filter(
        (item) =>
          item.q.toLowerCase().includes(query.toLowerCase()) ||
          item.a.toLowerCase().includes(query.toLowerCase()),
      ),
    }))
    .filter((s) => s.items.length > 0);

  const activeCategory = selectedCategory
    ? CATEGORIES.find((c) => c.key === selectedCategory)!
    : null;

  const showGrid = !query.trim() && !selectedCategory;
  const showDetail = !query.trim() && !!selectedCategory && !!activeCategory;
  const showSearch = !!query.trim();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-500 text-white">
              <Hammer className="h-4 w-4" />
            </span>
            Capture Connect
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/reviews" className="hover:text-foreground transition-colors">Reviews</Link>
            <Link to="/help" className="text-foreground font-medium">Help Centre</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-border bg-[var(--surface-elevated)] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
            How can we{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              help?
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Search our help articles or browse by topic below.
          </p>
          <div className="mt-8 relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search help articles…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>
      </section>

      {/* CATEGORY GRID */}
      {showGrid && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-2xl font-extrabold tracking-tight mb-8">Browse by topic</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm text-left transition-all hover:shadow-md hover:border-amber-500/40 cursor-pointer"
                  >
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${cat.bg}`}>
                      <Icon className={`h-5 w-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{cat.key}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{cat.description}</div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-amber-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View articles <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CATEGORY DETAIL */}
      {showDetail && (
        <CategoryDetail
          category={activeCategory!}
          onBack={() => setSelectedCategory(null)}
        />
      )}

      {/* SEARCH RESULTS */}
      {showSearch && (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-6">
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="mx-auto mb-4 h-8 w-8 opacity-40" />
                <p>No results for "<span className="font-medium text-foreground">{query}</span>"</p>
                <p className="mt-1 text-sm">Try different keywords or browse the topics above.</p>
              </div>
            ) : (
              <div className="space-y-12">
                <p className="text-sm text-muted-foreground">
                  Showing results for "<span className="font-medium text-foreground">{query}</span>"
                </p>
                {searchResults.map(({ section, items }) => (
                  <div key={section}>
                    <h2 className="mb-2 text-xl font-extrabold tracking-tight">{section}</h2>
                    <div className="rounded-2xl border border-border bg-card px-6">
                      {items.map((item) => (
                        <FaqItem key={item.q} q={item.q} a={item.a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CONTACT CTA */}
      <section className="border-t border-border py-20 bg-[var(--surface-elevated)]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Still need help?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Our support team is on hand to answer any questions not covered above.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold shadow-lg"
              asChild
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
