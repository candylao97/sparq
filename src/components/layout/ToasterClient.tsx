'use client'

import { Toaster } from 'react-hot-toast'

/**
 * Client-only wrapper for react-hot-toast's <Toaster>.
 * Must be rendered as a client component to avoid SSR/hydration mismatch —
 * react-hot-toast injects a <style> tag at runtime that doesn't exist during SSR,
 * causing React to throw a hydration error and (ironically) trigger an error toast.
 */
export function ToasterClient() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: '#fff',
          color: '#111827',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          fontFamily: 'var(--font-jakarta), sans-serif',
          fontSize: '14px',
        },
      }}
      containerStyle={{ top: 64 }}
    />
  )
}
