import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Parse this natural language search query for a marketplace focused on nails and lashes services, and extract structured filters as JSON.

Query: "${query}"

Return a JSON object with these optional fields:
- query: string (cleaned search terms)
- category: one of NAILS, LASHES (if detected — nail/manicure/pedicure/gel/acrylic/BIAB = NAILS; lash/eyelash/extensions/lash lift/volume/classic/hybrid = LASHES)
- location: string (suburb/city name if detected)
- maxPrice: number (if price mentioned)
- minPrice: number (if price range mentioned)
- date: string in YYYY-MM-DD format (if specific date mentioned, use relative dates from today 2026-03-15)
- minRating: number 1-5 (if quality requirement mentioned)

Only include fields that are clearly present in the query. Return only valid JSON, no explanation.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return NextResponse.json(JSON.parse(jsonMatch[0]))
      }
    }

    return NextResponse.json({ query })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json({ query: '' })
  }
}
