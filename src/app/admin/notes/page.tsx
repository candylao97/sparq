'use client'

import { useState, useEffect, useCallback } from 'react'
import { StickyNote, Plus, Pin, Trash2, Edit3 } from 'lucide-react'

type Note = {
  id: string
  subject: string
  body: string
  category: string
  pinned: boolean
  createdAt: string
  admin: { name: string | null; email: string | null }
}

const CATEGORIES = ['general', 'incident', 'feature', 'compliance', 'support']

export default function AdminNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ subject: '', body: '', category: 'general', pinned: false })
  const [saving, setSaving] = useState(false)

  const fetchNotes = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/notes')
      .then(r => r.json())
      .then(d => { setNotes(d.notes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  async function saveNote() {
    setSaving(true)
    const url = editId ? `/api/admin/notes/${editId}` : '/api/admin/notes'
    const method = editId ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm({ subject: '', body: '', category: 'general', pinned: false })
    fetchNotes()
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/admin/notes/${id}`, { method: 'DELETE' })
    fetchNotes()
  }

  async function togglePin(id: string, pinned: boolean) {
    await fetch(`/api/admin/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !pinned }),
    })
    fetchNotes()
  }

  function startEdit(note: Note) {
    setForm({ subject: note.subject, body: note.body, category: note.category, pinned: note.pinned })
    setEditId(note.id)
    setShowForm(true)
  }

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      general: 'bg-[#f9f2ef] text-[#717171]',
      incident: 'bg-red-50 text-red-600',
      feature: 'bg-blue-50 text-blue-600',
      compliance: 'bg-purple-50 text-purple-600',
      support: 'bg-green-50 text-green-600',
    }
    return map[cat] || 'bg-[#f9f2ef] text-[#717171]'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Notes</h1>
          <p className="text-sm text-[#717171]">Internal admin notes and records</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ subject: '', body: '', category: 'general', pinned: false }) }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A1A1A]"
        >
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-[#e8e1de] bg-white p-5">
          <h3 className="mb-4 font-bold text-[#1A1A1A]">{editId ? 'Edit Note' : 'New Note'}</h3>
          <div className="space-y-3">
            <input
              placeholder="Subject"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm focus:border-[#717171] focus:outline-none"
            />
            <textarea
              placeholder="Note body..."
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-[#e8e1de] px-3 py-2 text-sm focus:border-[#717171] focus:outline-none"
            />
            <div className="flex items-center gap-4">
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-[#e8e1de] px-3 py-2 text-sm focus:border-[#717171] focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-[#717171]">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm({ ...form, pinned: e.target.checked })}
                  className="rounded border-[#e8e1de]"
                />
                Pin to top
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={saveNote}
              disabled={saving || !form.subject || !form.body}
              className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-50"
            >
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null) }}
              className="rounded-lg border border-[#e8e1de] px-4 py-2 text-sm font-medium text-[#717171] hover:bg-[#f9f2ef]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#e8e1de] bg-white p-5">
              <div className="h-5 w-40 rounded bg-[#f9f2ef]" />
              <div className="mt-3 h-4 w-full rounded bg-[#f9f2ef]" />
            </div>
          ))
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-[#e8e1de] bg-white p-12 text-center">
            <StickyNote className="mx-auto mb-2 h-8 w-8 text-[#D5CEC9]" />
            <p className="text-sm text-[#717171]">No notes yet</p>
          </div>
        ) : (
          notes.map(n => (
            <div
              key={n.id}
              className={`rounded-2xl border bg-white p-5 ${
                n.pinned ? 'border-yellow-200 bg-yellow-50/30' : 'border-[#e8e1de]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {n.pinned && <Pin className="h-3.5 w-3.5 text-yellow-600" />}
                    <h3 className="font-bold text-[#1A1A1A]">{n.subject}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(n.category)}`}>
                      {n.category}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[#717171]">{n.body}</p>
                  <div className="mt-3 text-xs text-[#717171]">
                    {n.admin.name || n.admin.email} &middot; {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePin(n.id, n.pinned)}
                    className={`rounded-lg p-1.5 ${n.pinned ? 'text-yellow-600 hover:bg-yellow-100' : 'text-[#717171] hover:bg-[#f9f2ef]'}`}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button onClick={() => startEdit(n)} className="rounded-lg p-1.5 text-[#717171] hover:bg-[#f9f2ef]">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteNote(n.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
