'use client'

import { useState, useEffect } from 'react'
import { Grid3X3 } from 'lucide-react'

type CategoryInfo = {
  name: string
  serviceCount: number
  providerCount: number
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(d => { setCategories(d.categories || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const formatName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Categories</h1>
        <p className="text-sm text-[#717171]">View service categories and usage</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#e8e1de] bg-white p-5">
              <div className="h-5 w-28 rounded bg-[#f9f2ef]" />
              <div className="mt-3 h-4 w-20 rounded bg-[#f9f2ef]" />
            </div>
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-[#e8e1de] bg-white p-12 text-center text-[#717171]">
            No categories configured
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.name} className="rounded-2xl border border-[#e8e1de] bg-white p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f9f2ef]">
                  <Grid3X3 className="h-5 w-5 text-[#717171]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1A]">{formatName(cat.name)}</h3>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <div className="text-xl font-bold text-[#1A1A1A]">{cat.serviceCount}</div>
                  <div className="text-xs text-[#717171]">Services</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1A1A1A]">{cat.providerCount}</div>
                  <div className="text-xs text-[#717171]">Providers</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
