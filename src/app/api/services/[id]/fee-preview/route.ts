import { NextResponse } from 'next/server'
import { getSettingFloat } from '@/lib/settings'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const price = parseFloat(searchParams.get('price') || '0')
  if (isNaN(price) || price < 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }
  const feeRate = await getSettingFloat('platform.fee_rate')
  const fee = Math.round(price * feeRate * 100) / 100
  return NextResponse.json({ feeRate, fee })
}
