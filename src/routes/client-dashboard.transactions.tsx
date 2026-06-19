import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

export const Route = createFileRoute("/client-dashboard/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — TradeHub" },
      { name: "description", content: "View your TradeHub payment history." },
    ],
  }),
  component: TransactionsPage,
});

type Transaction = {
  id: string;
  pro: string;
  service: string;
  date: string;
  amount: number;
  method: string;
  status: "paid" | "refunded" | "pending";
  type: "payment" | "refund";
};

const TRANSACTIONS: Transaction[] = [
  { id: "t1", pro: "Mike Johnson", service: "Full rewire — 3-bed house", date: "2026-04-10", amount: 1800, method: "Credit Card", status: "paid", type: "payment" },
  { id: "t2", pro: "Sarah Williams", service: "Boiler service", date: "2026-03-18", amount: 120, method: "PayPal", status: "paid", type: "payment" },
  { id: "t3", pro: "David Clarke", service: "Kitchen cabinet installation", date: "2026-03-10", amount: 650, method: "Bank Transfer", status: "paid", type: "payment" },
  { id: "t4", pro: "Emma Stone", service: "Living room & hallway repaint", date: "2026-02-15", amount: 450, method: "Credit Card", status: "paid", type: "payment" },
  { id: "t5", pro: "Tom Baker", service: "Bathroom installation (cancelled)", date: "2026-01-20", amount: 2200, method: "Credit Card", status: "refunded", type: "refund" },
  { id: "t6", pro: "James Carter", service: "Garden landscaping", date: "2025-12-02", amount: 380, method: "PayPal", status: "paid", type: "payment" },
];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
  refunded: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

function TransactionsPage() {
  const thisMonth = new Date().toISOString().slice(0, 7);

  const totalSpent = TRANSACTIONS
    .filter((t) => t.type === "payment" && t.status === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunded = TRANSACTIONS
    .filter((t) => t.type === "refund")
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthSpent = TRANSACTIONS
    .filter((t) => t.type === "payment" && t.status === "paid" && t.date.startsWith(thisMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthRefunded = TRANSACTIONS
    .filter((t) => t.type === "refund" && t.date.startsWith(thisMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBookings = TRANSACTIONS.filter((t) => t.type === "payment").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-[1500px] space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/client-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Transactions</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Transactions table — left */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {["Date", "Pro", "Service", "Amount", "Method"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-sm text-gray-900 dark:text-white">{h}</th>
                        ))}
                        <th className="text-left py-2 px-3 text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-1">
                            Refunded
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-sm">
                                    Service fees are non-refundable. Only the booking fee is refunded when a booking is cancelled.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </th>
                        <th className="text-left py-2 px-3 text-sm text-gray-900 dark:text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TRANSACTIONS.map((t) => (
                        <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{t.date}</td>
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{t.pro}</td>
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{t.service}</td>
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">${t.amount.toLocaleString()}</td>
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">{t.method}</td>

                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                            {t.type === "refund" ? `$${t.amount.toLocaleString()}` : "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[t.status]}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security + Summary — right */}
          <div className="lg:w-[420px] flex flex-col gap-6 shrink-0">
            <Card className="">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm px-3 py-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>End-to-end encryption during checkout.</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-gray-400" />
                    <span>Industry-standard compliance and fraud monitoring via Stripe.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Billing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Total Spent</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">${totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">This Month</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">${thisMonthSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Total Refunded</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">${totalRefunded.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-300">Refunded This Month</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">${thisMonthRefunded.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
