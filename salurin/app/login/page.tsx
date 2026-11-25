'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pesan, setPesan] = useState('')
  const [loading, setLoading] = useState(false)

  async function masuk(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPesan('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setPesan('Gagal masuk: ' + error.message)
      return
    }
    router.push('/dashboard')
  }

  async function daftar() {
    setLoading(true)
    setPesan('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nama } },
    })
    setLoading(false)
    if (error) {
      setPesan('Gagal daftar: ' + error.message)
      return
    }
    if (data.session) router.push('/dashboard')
    else setPesan('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={masuk} className="w-full max-w-sm bg-white rounded-xl border p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Salurin</h1>
          <p className="text-sm text-gray-500">Masuk untuk mengelola ZIS</p>
        </div>
        <label className="block text-sm">
          Nama (untuk daftar baru)
          <input className="mt-1 w-full border rounded-lg p-2" value={nama}
            onChange={(e) => setNama(e.target.value)} />
        </label>
        <label className="block text-sm">
          Email
          <input type="email" required className="mt-1 w-full border rounded-lg p-2" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm">
          Password (minimal 6 karakter)
          <input type="password" required minLength={6} className="mt-1 w-full border rounded-lg p-2"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {pesan && <p className="text-sm text-red-600">{pesan}</p>}
        <button disabled={loading} className="w-full bg-emerald-700 text-white rounded-lg p-2 font-semibold">
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
        <button type="button" onClick={daftar} disabled={loading}
          className="w-full border rounded-lg p-2 font-semibold">
          Daftar akun baru
        </button>
      </form>
    </main>
  )
}