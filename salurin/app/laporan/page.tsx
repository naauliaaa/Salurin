'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Masuk = { id: number; tanggal: string; jenis: string; jumlah: number }
type Salur = {
  id: number
  tanggal: string
  sumber_dana: string
  penerima: string
  jumlah: number
  status: string
  program: { nama: string } | null
}

const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

export default function LaporanPage() {
  const router = useRouter()
  const [siap, setSiap] = useState(false)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [masuk, setMasuk] = useState<Masuk[]>([])
  const [salur, setSalur] = useState<Salur[]>([])
  const [error, setError] = useState('')

  // 1. Cek login dulu
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else setSiap(true)
    })
  }, [router])

  // 2. Ambil data setelah login terkonfirmasi
  useEffect(() => {
    if (!siap) return
    async function load() {
      setError('')
      let qm = supabase
        .from('penerimaan')
        .select('id, tanggal, jenis, jumlah')
        .order('tanggal', { ascending: false })
      let qs = supabase
        .from('penyaluran')
        .select('id, tanggal, sumber_dana, penerima, jumlah, status, program(nama)')
        .order('tanggal', { ascending: false })
      if (dari) {
        qm = qm.gte('tanggal', dari)
        qs = qs.gte('tanggal', dari)
      }
      if (sampai) {
        qm = qm.lte('tanggal', sampai)
        qs = qs.lte('tanggal', sampai)
      }
      const [{ data: m, error: e1 }, { data: s, error: e2 }] = await Promise.all([qm, qs])
      if (e1 || e2) {
        setError((e1 || e2)!.message)
        return
      }
      setMasuk((m ?? []) as Masuk[])
      setSalur((s ?? []) as unknown as Salur[])
    }
    load()
  }, [siap, dari, sampai])

  const totalMasuk = masuk.reduce((a, b) => a + Number(b.jumlah), 0)
  const totalSalur = salur
    .filter((x) => x.status === 'Disetujui')
    .reduce((a, b) => a + Number(b.jumlah), 0)

  if (!siap) return <main className="p-6">Memeriksa login...</main>

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Laporan</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="border rounded px-3 py-1">Cetak</button>
          <Link href="/dashboard" className="border rounded px-3 py-1">Kembali</Link>
        </div>
      </div>

      <div className="flex gap-3 mb-6 print:hidden">
        <label className="text-sm">Dari<br />
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="border rounded px-2 py-1" />
        </label>
        <label className="text-sm">Sampai<br />
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="border rounded px-2 py-1" />
        </label>
      </div>

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      <h2 className="font-semibold mb-2">Penerimaan</h2>
      <table className="w-full text-sm mb-2 border">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-2">Tanggal</th>
            <th className="p-2">Jenis</th>
            <th className="p-2 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {masuk.map((x) => (
            <tr key={x.id} className="border-t">
              <td className="p-2">{x.tanggal}</td>
              <td className="p-2">{x.jenis}</td>
              <td className="p-2 text-right">{rp(Number(x.jumlah))}</td>
            </tr>
          ))}
          {masuk.length === 0 && (
            <tr><td colSpan={3} className="p-2 text-gray-500">Tidak ada data.</td></tr>
          )}
        </tbody>
      </table>
      <p className="font-bold mb-6">Total masuk: {rp(totalMasuk)}</p>

      <h2 className="font-semibold mb-2">Penyaluran</h2>
      <table className="w-full text-sm mb-2 border">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-2">Tanggal</th>
            <th className="p-2">Program</th>
            <th className="p-2">Penerima</th>
            <th className="p-2">Sumber</th>
            <th className="p-2 text-right">Jumlah</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {salur.map((x) => (
            <tr key={x.id} className="border-t">
              <td className="p-2">{x.tanggal}</td>
              <td className="p-2">{x.program?.nama ?? '-'}</td>
              <td className="p-2">{x.penerima}</td>
              <td className="p-2">{x.sumber_dana}</td>
              <td className="p-2 text-right">{rp(Number(x.jumlah))}</td>
              <td className="p-2">{x.status}</td>
            </tr>
          ))}
          {salur.length === 0 && (
            <tr><td colSpan={6} className="p-2 text-gray-500">Tidak ada data.</td></tr>
          )}
        </tbody>
      </table>
      <p className="font-bold mb-2">Total disalurkan (Disetujui): {rp(totalSalur)}</p>
      <p className="font-bold">Saldo: {rp(totalMasuk - totalSalur)}</p>
    </main>
  )
}