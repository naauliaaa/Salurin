'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Profil = { nama: string; peran: string }
type Program = { id: number; nama: string }

export default function DashboardPage() {
  const router = useRouter()
  const [profil, setProfil] = useState<Profil | null>(null)
  const [program, setProgram] = useState<Program[]>([])
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    async function muat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: p } = await supabase
        .from('profiles').select('nama, peran').eq('id', user.id).single()
      const { data: pr } = await supabase
        .from('program').select('id, nama').order('id')
      setProfil(p)
      setProgram(pr ?? [])
      setMemuat(false)
    }
    muat()
  }, [router])

  async function keluar() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (memuat) return <main className="p-6">Memuat...</main>

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salurin</h1>
          <p className="text-gray-600">
            Halo, {profil?.nama}. Peran Anda: <b>{profil?.peran}</b>
          </p>
        </div>
        <button onClick={keluar} className="border rounded-lg px-3 py-1.5">Keluar</button>
      </div>
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Program (dibaca dari database)</h2>
        <ul className="list-disc pl-5">
          {program.map((x) => <li key={x.id}>{x.nama}</li>)}
                </ul>
      </section>

      <div className="flex flex-wrap gap-2 mt-4">
        <Link href="/salur" className="border rounded px-3 py-2">Penyaluran</Link>
        <Link href="/zis" className="border rounded px-3 py-2">Penerimaan ZIS</Link>
        <Link href="/laporan" className="border rounded px-3 py-2">Laporan</Link>
      </div>
    </main>
  )
}
    