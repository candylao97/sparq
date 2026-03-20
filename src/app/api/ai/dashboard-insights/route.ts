import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are the Sparq Dashboard Intelligence engine. Given a talent's dashboard context, generate personalised insights as a JSON object.

Rules:
- Every value must be a single concise sentence (max 140 chars) or null if not applicable
- Be warm, specific, and actionable — use the talent's first name and real numbers from context
- Australian English spelling (e.g. "personalised", "favourite")
- Never use the word "AI" — you are invisible infrastructure
- scoreTips: only include tips for pillars scoring below 70% of their max. Keys must be one of: "review", "completion", "response", "consistency", "verification". Each tip should be specific and actionable based on the actual data.
- tierProjection: estimate weeks to next tier based on current score and gap. Null if already ELITE.
- goalSuggestion: suggest a realistic monthly earnings goal based on the 3-month average, or null if insufficient data
- briefing: summarise the most important thing the talent should focus on right now (pending bookings, score changes, earnings momentum)
- earningsNarrative: compare this month vs last month with percentage and identify the main driver
- weeklyInsight: one actionable insight about their overall performance trend
- benchmarkNote: compare their score/rating against typical performers in their category
- portfolioGapNote: if they have fewer than 4 photos, suggest adding more with a specific benefit. Null if 4+ photos.

Tier thresholds: NEWCOMER (0-30), RISING (31-50), TRUSTED (51-70), PRO (71-85), ELITE (86-100).

Return ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "briefing": string | null,
  "earningsNarrative": string | null,
  "goalSuggestion": string | null,
  "scoreTips": { [pillar: string]: string } | null,
  "tierProjection": string | null,
  "weeklyInsight": string | null,
  "benchmarkNote": string | null,
  "portfolioGapNote": string | null
}`

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
        { role: 'user', content: `Dashboard context:\n${JSON.stringify(context, null, 2)}` },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          briefing: parsed.briefing || null,
          earningsNarrative: parsed.earningsNarrative || null,
          goalSuggestion: parsed.goalSuggestion || null,
          scoreTips: parsed.scoreTips || null,
          tierProjection: parsed.tierProjection || null,
          weeklyInsight: parsed.weeklyInsight || null,
          benchmarkNote: parsed.benchmarkNote || null,
          portfolioGapNote: parsed.portfolioGapNote || null,
        })
      }
    }

    return NextResponse.json({
      briefing: null, earningsNarrative: null, goalSuggestion: null,
      scoreTips: null, tierProjection: null, weeklyInsight: null,
      benchmarkNote: null, portfolioGapNote: null,
    })
  } catch (error) {
    console.error('AI dashboard insights error:', error)
    return NextResponse.json({
      briefing: null, earningsNarrative: null, goalSuggestion: null,
      scoreTips: null, tierProjection: null, weeklyInsight: null,
      benchmarkNote: null, portfolioGapNote: null,
    })
  }
}
