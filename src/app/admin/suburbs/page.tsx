'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

type Suburb = {
  id: string
  name: string
  postcode: string
  state: string
  city: string
  isActive: boolean
}

export default function AdminSuburbs() {
  const [suburbs, setSuburbs] = useState<Suburb[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', postcode: '', state: 'VIC', city: 'Melbourne' })
  const [saving, setSaving] = useState(false)

  const fetchSuburbs = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/suburbs')
      .then(r => r.json())
      .then(d => { setSuburbs(d.suburbs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchSuburbs() }, [fetchSuburbs])

  async function addSuburb() {
    setSaving(true)
    await fetch('/api/admin/suburbs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', postcode: '', state: 'VIC', city: 'Melbourne' })
    fetchSuburbs()
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/suburbs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchSuburbs()
  }

  async function deleteSuburb(id: string) {
    if (!confirm('Delete this suburb?')) return
    await fetch(`/api/admin/suburbs/${id}`, { method: 'DELETE' })
    fetchSuburbs()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suburbs</h1>
          <p className="text-sm text-gray-500">Manage service areas</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> Add Suburb
        </button>
      </div>

      {/* Add suburb form */}
      {showAdd && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-bold text-gray-900">Add New Suburb</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
            <input
              placeholder="Postcode"
              value={form.postcode}
              onChange={e => setForm({ ...form, postcode: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
            <input
              placeholder="State"
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={addSuburb}
              disabled={saving || !form.name || !form.postcode}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Suburb list */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-5 py-3">Suburb</th>
              <th className="px-5 py-3">Postcode</th>
              <th className="px-5 py-3">State</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Active</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : suburbs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  No suburbs configured
                </td>
              </tr>
            ) : (
              suburbs.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{s.postcode}</td>
                  <td className="px-5 py-4 text-gray-600">{s.state}</td>
                  <td className="px-5 py-4 text-gray-600">{s.city}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleActive(s.id, s.isActive)}>
                      {s.isActive ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => deleteSuburb(s.id)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
