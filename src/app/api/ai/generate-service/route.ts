import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { description } = await req.json()
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a service listing generator for Sparq, an Australian marketplace for nails and lashes.

Given a talent's natural language description of a service they want to offer, extract structured service details as JSON.

Return a JSON object with these fields:
- title: string (concise, professional service name, max 60 chars)
- category: "NAILS" or "LASHES" (infer from context — nail/manicure/pedicure/gel/acrylic/BIAB/nail art = NAILS; lash/eyelash/extensions/lash lift/volume/classic/hybrid = LASHES)
- description: string (2-3 sentence professional description expanding on what the talent wrote)
- price: number (in AUD, positive, round to nearest whole number)
- duration: number (in minutes, positive, round to nearest 15-minute increment)
- locationTypes: "AT_HOME" or "STUDIO" or "BOTH" (infer from context — "at my studio" = STUDIO, "I come to you"/"mobile" = AT_HOME, if unclear default to BOTH)
- maxGuests: number or null (only if group sessions are mentioned, otherwise null)

Rules:
- All prices are in AUD
- If price is not mentioned, estimate a reasonable market rate for the service in Australia
- If duration is not mentioned, estimate a reasonable duration for the service type
- Make the description sound professional and appealing
- Return ONLY valid JSON, no explanation or markdown`,
      messages: [
        { role: 'user', content: description },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const result = {
          title: String(parsed.title || '').slice(0, 60),
          category: ['NAILS', 'LASHES'].includes(parsed.category) ? parsed.category : 'NAILS',
          description: String(parsed.description || ''),
          price: Math.max(1, Math.round(Number(parsed.price) || 50)),
          duration: Math.max(15, Math.round((Number(parsed.duration) || 60) / 15) * 15),
          locationTypes: ['AT_HOME', 'STUDIO', 'BOTH'].includes(parsed.locationTypes) ? parsed.locationTypes : 'BOTH',
          maxGuests: parsed.maxGuests ? Math.max(1, Math.round(Number(parsed.maxGuests))) : null,
        }
        return NextResponse.json(result)
      }
    }

    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  } catch (error) {
    console.error('AI generate-service error:', error)
    return NextResponse.json({ error: 'Failed to generate service' }, { status: 500 })
  }
}
