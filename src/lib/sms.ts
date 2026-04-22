/**
 * Sparq SMS Service — Twilio REST API (no SDK required)
 *
 * Set in .env:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_FROM_NUMBER=+61400000000
 *
 * Without these vars the function logs to console (dev fallback).
 */

async function sendTwilioSms(to: string, body: string): Promise<{ sid: string | null; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !from) {
    console.log('[SMS_DEV]', to, body)
    return { sid: null }
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    )
    const data = await res.json() as { sid?: string; error_code?: number; message?: string }

    if (!res.ok || data.error_code) {
      console.error(`[SMS_FAILED] to=${to} error_code=${data.error_code} message=${data.message}`)
      return { sid: null, error: data.message }
    }

    console.log(`[SMS_SENT] to=${to} sid=${data.sid}`)
    return { sid: data.sid ?? null }
  } catch (err) {
    console.error(`[SMS_ERROR] to=${to}`, err)
    return { sid: null, error: String(err) }
  }
}

function normalisePhone(to: string): string {
  return to.startsWith('0') ? '+61' + to.slice(1) : to
}

// ── SMS Templates ──────────────────────────────────────────────────

/**
 * Sent to customer when their booking request is submitted.
 */
export async function sendBookingRequestSms(
  toPhone: string | null | undefined,
  opts: {
    customerName: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
  }
): Promise<void> {
  if (!toPhone) return
  const firstName = opts.customerName.split(' ')[0]
  await sendTwilioSms(
    normalisePhone(toPhone),
    `Hi ${firstName}! Your Sparq booking request for ${opts.serviceTitle} with ${opts.providerName} on ${opts.bookingDate} at ${opts.bookingTime} has been sent. We'll text you when it's confirmed.`
  )
}

/**
 * Sent to customer when provider confirms their booking.
 */
export async function sendBookingConfirmedSms(
  toPhone: string | null | undefined,
  opts: {
    customerName: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
  }
): Promise<void> {
  if (!toPhone) return
  const firstName = opts.customerName.split(' ')[0]
  await sendTwilioSms(
    normalisePhone(toPhone),
    `Confirmed! Your ${opts.serviceTitle} with ${opts.providerName} is set for ${opts.bookingDate} at ${opts.bookingTime}. See you then! \u2013 Sparq`
  )
}

/**
 * Sent to provider when a new booking request arrives.
 */
export async function sendNewBookingRequestSms(
  toPhone: string | null | undefined,
  opts: {
    providerName: string
    customerName: string
    serviceTitle: string
    bookingDate: string
    bookingTime: string
  }
): Promise<void> {
  if (!toPhone) return
  const firstName = opts.providerName.split(' ')[0]
  await sendTwilioSms(
    normalisePhone(toPhone),
    `Hi ${firstName}! New booking request from ${opts.customerName} for ${opts.serviceTitle} on ${opts.bookingDate} at ${opts.bookingTime}. Log in to Sparq to accept.`
  )
}

/**
 * 24-hour appointment reminder — sent to customer.
 */
export async function sendAppointmentReminderSms(
  toPhone: string | null | undefined,
  opts: {
    customerName: string
    serviceTitle: string
    providerName: string
    bookingDate: string
    bookingTime: string
    address?: string | null
  }
): Promise<void> {
  if (!toPhone) return
  const firstName = opts.customerName.split(' ')[0]
  const locationPart = opts.address ? ` at ${opts.address}` : ''
  await sendTwilioSms(
    normalisePhone(toPhone),
    `Reminder: ${firstName}, your ${opts.serviceTitle} with ${opts.providerName} is tomorrow at ${opts.bookingTime}${locationPart}. \u2013 Sparq`
  )
}
