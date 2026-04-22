import { NextResponse } from 'next/server'
import { getSettingFloat } from '@/lib/settings'

// Public endpoint — commission rates are not sensitive info
export async function GET() {
  const [standardRate, proRate, eliteRate] = await Promise.all([
    getSettingFloat('commission.NEWCOMER'),
    getSettingFloat('commission.PRO'),
    getSettingFloat('commission.ELITE'),
  ])

  return NextResponse.json({
    standardRate: Math.round(standardRate * 100),
    proRate: Math.round(proRate * 100),
    eliteRate: Math.round(eliteRate * 100),
  })
}
