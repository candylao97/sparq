'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Check } from 'lucide-react'

type Setting = {
  id: string
  key: string
  value: string
  label: string | null
  group: string
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function saveSetting(key: string) {
    setSaving(key)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: edited[key] }),
    })
    setSaving(null)
    setSaved(key)
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: edited[key] } : s))
    setEdited(prev => { const next = { ...prev }; delete next[key]; return next })
    setTimeout(() => setSaved(null), 2000)
  }

  const groups = Array.from(new Set(settings.map(s => s.group)))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Platform configuration</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6">
              <div className="h-5 w-28 rounded bg-gray-100" />
              <div className="mt-4 space-y-3">
                <div className="h-10 w-full rounded bg-gray-100" />
                <div className="h-10 w-full rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group} className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 font-bold capitalize text-gray-900">
                <Settings className="h-4 w-4 text-gray-400" />
                {group}
              </h2>
              <div className="space-y-4">
                {settings
                  .filter(s => s.group === group)
                  .map(s => {
                    const currentValue = s.key in edited ? edited[s.key] : s.value
                    const isChanged = s.key in edited && edited[s.key] !== s.value
                    const isBool = s.value === 'true' || s.value === 'false'

                    return (
                      <div key={s.key} className="flex items-center gap-4">
                        <div className="min-w-[200px]">
                          <label className="text-sm font-medium text-gray-700">
                            {s.label || s.key}
                          </label>
                          <div className="text-xs text-gray-400">{s.key}</div>
                        </div>
                        <div className="flex flex-1 items-center gap-2">
                          {isBool ? (
                            <button
                              onClick={() => {
                                const newVal = currentValue === 'true' ? 'false' : 'true'
                                setEdited({ ...edited, [s.key]: newVal })
                              }}
                              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                                currentValue === 'true'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {currentValue === 'true' ? 'Enabled' : 'Disabled'}
                            </button>
                          ) : (
                            <input
                              type="text"
                              value={currentValue}
                              onChange={e => setEdited({ ...edited, [s.key]: e.target.value })}
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                          )}
                          {isChanged && (
                            <button
                              onClick={() => saveSetting(s.key)}
                              disabled={saving === s.key}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              {saving === s.key ? (
                                'Saving...'
                              ) : (
                                <><Save className="h-3 w-3" /> Save</>
                              )}
                            </button>
                          )}
                          {saved === s.key && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
