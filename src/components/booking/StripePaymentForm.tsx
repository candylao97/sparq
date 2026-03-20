'use client'

import { useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react'

interface StripePaymentFormProps {
  clientSecret: string
  bookingId: string
  amount: number
  onSuccess: () => void
  onBack: () => void
}

/* ─── Inner form (must be inside <Elements>) ──────────────────────────── */
function CheckoutForm({
  bookingId,
  amount,
  onSuccess,
  onBack,
}: Omit<StripePaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/customer?booking=success&id=${bookingId}`,
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(
        confirmError.message || 'We couldn\'t process your card. Please check your details and try again.'
      )
      setProcessing(false)
    } else {
      // Card authorized — hold placed but not charged yet
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="flex-1"
          disabled={processing}
        >
          Back
        </Button>
        <Button
          type="submit"
          loading={processing}
          disabled={!stripe || !elements}
          className="flex-1"
        >
          <Lock className="mr-1.5 h-4 w-4" />
          Hold {formatCurrency(amount)}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-[#717171]">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>
          This is a hold, not a charge. You only pay when your artist confirms the booking.
        </span>
      </div>
    </form>
  )
}

/* ─── Outer wrapper (provides <Elements>) ─────────────────────────────── */
export function StripePaymentForm(props: StripePaymentFormProps) {
  const { clientSecret, ...rest } = props

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#E96B56',
            colorBackground: '#ffffff',
            fontFamily: 'Manrope, system-ui, sans-serif',
            borderRadius: '12px',
          },
          rules: {
            '.Input': {
              border: '1px solid #e5e7eb',
              boxShadow: 'none',
              padding: '12px',
            },
            '.Input:focus': {
              border: '1px solid #E96B56',
              boxShadow: '0 0 0 3px rgba(233, 107, 86, 0.15)',
            },
            '.Label': {
              fontWeight: '500',
              fontSize: '14px',
              marginBottom: '6px',
            },
          },
        },
      }}
    >
      <CheckoutForm {...rest} />
    </Elements>
  )
}
