/**
 * Stripe.js 初期化
 */
import { loadStripe, Stripe } from "@stripe/stripe-js";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise || Promise.resolve(null);
}

export function redirectToCheckout(url: string): void {
  window.location.href = url;
}
