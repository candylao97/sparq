import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are the Sparq Fan Dashboard Intelligence engine. Given a fan's dashboard context, generate personalised insights as a JSON object.

Rules:
- Every value must be a single concise sentence (max 140 chars) or null if not applicable
- Be warm, specific, and actionable — use the fan's first name and real numbers from context
- Australian English spelling (e.g. "personalised", "favourite")
- Never use the word "AI" — you are invisible infrastructure
- briefing: summarise the most important thing right now — next booking details, unreviewed sessions, or a welcome-back nudge
- nextBookingSummary: if there is an upcoming booking, provide helpful context about the talent (score, speciality, previous sessions). Null if no upcoming bookings.
- bookingNarrative: summarise their booking patterns (total sessions, favourite category, most-booked talent). Null if fewer than 2 completed bookings.
- reviewPrompt: if there are unreviewed completed bookings, warmly encourage a review for the most recent one, mentioning the talent's name. Null if all reviewed.
- spendingNarrative: highlight how much they've saved by booking through Sparq compared to average local service prices (use estimatedSavings from context). Frame it positively — e.g. "You've saved $X by booking through Sparq — that's Y% less than average local prices." Null if fewer than 2 completed bookings.
- talentRecommendation: based on their most-booked category and talents, suggest exploring a different talent or related service. Null if fewer than 2 completed bookings.
- discoveryRecommendation: suggest a category or service type the fan hasn't tried yet. Null if they have tried all categories.
- engagementNudge: if no upcoming bookings or last booking was more than 14 days ago, nudge them to book again. Null if they have an upcoming booking within 7 days.

Return ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "briefing": string | null,
  "nextBookingSummary": string | null,
  "bookingNarrative": string | null,
  "reviewPrompt": string | null,
  "spendingNarrative": string | null,
  "talentRecommendation": string | null,
  "discoveryRecommendation": string | null,
  "engagementNudge": string | null
}`

const EMPTY_RESPONSE = {
  briefing: null, nextBookingSummary: null, bookingNarrative: null,
  reviewPrompt: null, spendingNarrative: null, talentRecommendation: null,
  discoveryRecommendation: null, engagementNudge: null,
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { context } = await req.json()
    if (!context) return NextResponse.json({ error: 'Context required' }, { status: 400 })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Fan dashboard context:\n${JSON.stringify(context, null, 2)}` },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          briefing: parsed.briefing || null,
          nextBookingSummary: parsed.nextBookingSummary || null,
          bookingNarrative: parsed.bookingNarrative || null,
          reviewPrompt: parsed.reviewPrompt || null,
          spendingNarrative: parsed.spendingNarrative || null,
          talentRecommendation: parsed.talentRecommendation || null,
          discoveryRecommendation: parsed.discoveryRecommendation || null,
          engagementNudge: parsed.engagementNudge || null,
        })
      }
    }

    return NextResponse.json(EMPTY_RESPONSE)
  } catch (error) {
    console.error('AI customer insights error:', error)
    return NextResponse.json(EMPTY_RESPONSE)
  }
}
