import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";

interface StripePaymentFormProps {
  clientSecret: string;
  /** Rendered on the submit button, e.g. "$123.45". */
  amountLabel: string;
  /** Where Stripe redirects for payment methods that require it (e.g. bank redirects). */
  returnUrl: string;
  onSuccess: () => void;
}

/** Reusable Stripe Elements card form. Wraps the target page's `clientSecret` in an <Elements> provider. */
export function StripePaymentForm({
  clientSecret,
  amountLabel,
  returnUrl,
  onSuccess,
}: StripePaymentFormProps) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret }}>
      <StripePaymentFormInner
        amountLabel={amountLabel}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}

function StripePaymentFormInner({
  amountLabel,
  returnUrl,
  onSuccess,
}: Omit<StripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSuccess();
      return;
    }

    setErrorMessage("Payment could not be completed. Please try again.");
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ wallets: { applePay: "auto", googlePay: "never" } }} />

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Pay {amountLabel}
          </>
        )}
      </Button>
    </form>
  );
}
