'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Program = { id: number; nama: string }
type Baris = {
  id: number
  tanggal: string
  jenis: string
  jumlah: number
  muzakki: { nama: string } | null
  program: { nama: string } | null
}

const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n)

export default function ZisMasukPage() {
  const router = useRouter()
  const [peran, setPeran] = useState('')
  const [program, setProgram] = useState<Program[]>([])
  const [daftar, setDaftar] = useState<Baris[]>([])
  const [namaMuzakki, setNamaMuzakki] = useState<string[]>([])
  const [tanggal, setTanggal] = useState('')
  const [nama, setNama] = useState('')
  const [jenis, setJenis] = useState('Zakat')
  const [programId, setProgramId] = useState('')
  const [jumlah, setJumlah] = useState('')
  const [pesan, setPesan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  useEffect(() => {
    setTanggal(new Date().toISOString().slice(0, 10))
  }, [])
  const muat = useCallback(async () => {
    const { data: pen } = await supabase
      .from('penerimaan')
      .select('id, tanggal, jenis, jumlah, muzakki(nama), program(nama)')
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false })
    setDaftar((pen ?? []) as unknown as Baris[])
    const { data: mz } = await supabase.from('muzakki').select('nama').order('nama')
    setNamaMuzakki((mz ?? []).map((m) => m.nama as string))
  }, [])

  useEffect(() => {
    async function awal() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: p } = await supabase
        .from('profiles').select('peran').eq('id', user.id).single()
      setPeran(p?.peran ?? '')
      const { data: pr } = await supabase
        .from('program').select('id, nama').order('id')
      setProgram(pr ?? [])
      await muat()
    }
    awal()
  }, [router, muat])

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    setPesan('')
    setMenyimpan(true)
    const nm = nama.trim()
    const jml = Number(jumlah)
    if (!nm || !(jml > 0)) {
      setPesan('Isi nama muzakki dan jumlah yang benar.')
      setMenyimpan(false)
      return
    }
    // cari muzakki, kalau belum ada dibuat baru
    const cari = await supabase.from('muzakki').select('id').eq('nama', nm).limit(1).maybeSingle()
    let muzakkiId = cari.data?.id as number | undefined
    if (!muzakkiId) {
      const baru = await supabase.from('muzakki').insert({ nama: nm }).select('id').single()
      if (baru.error) {
        setPesan('Gagal menyimpan muzakki: ' + baru.error.message)
        setMenyimpan(false)
        return
      }
      muzakkiId = baru.data.id
    }
    const { error } = await supabase.from('penerimaan').insert({
      tanggal,
      muzakki_id: muzakkiId,
      jenis,
      program_id: programId ? Number(programId) : null,
      jumlah: jml,
    })
    setMenyimpan(false)
    if (error) {
      setPesan('Gagal menyimpan: ' + error.message)
      return
    }
    setNama('')
    setJumlah('')
    setPesan('ZIS masuk tercatat.')
    await muat()
  }

  const bolehInput = peran === 'admin' || peran === 'staf'
  const total = daftar.reduce((t, x) => t + Number(x.jumlah), 0)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ZIS masuk</h1>
          <p className="text-gray-600">Total tercatat: <b>{rupiah(total)}</b></p>
        </div>
        <Link href="/dashboard" className="border rounded-lg px-3 py-1.5">Kembali</Link>
      </div>

      {bolehInput && (
        <form onSubmit={kirim} className="border rounded-xl p-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Tanggal
            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">Nama muzakki
            <input list="daftar-muzakki" required value={nama} onChange={(e) => setNama(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
            <datalist id="daftar-muzakki">
              {namaMuzakki.map((n) => <option key={n} value={n} />)}
            </datalist>
          </label>
          <label className="text-sm">Jenis dana
            <select value={jenis} onChange={(e) => setJenis(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2">
              <option>Zakat</option><option>Infak</option><option>Sedekah</option>
            </select>
          </label>
          <label className="text-sm">Program tujuan
            <select value={programId} onChange={(e) => setProgramId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2">
              <option value="">Umum</option>
              {program.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <label className="text-sm">Jumlah (Rp)
            <input type="number" min={1000} step={1000} required value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <div className="flex items-end">
            <button disabled={menyimpan}
              className="w-full bg-emerald-700 text-white rounded-lg p-2 font-semibold">
              {menyimpan ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          {pesan && <p className="sm:col-span-2 text-sm text-emerald-800">{pesan}</p>}
        </form>
      )}

      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Tanggal</th><th className="p-3">Muzakki</th>
              <th className="p-3">Jenis</th><th className="p-3">Program</th>
              <th className="p-3 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-3">{x.tanggal}</td>
                <td className="p-3">{x.muzakki?.nama}</td>
                <td className="p-3">{x.jenis}</td>
                <td className="p-3">{x.program?.nama ?? 'Umum'}</td>
                <td className="p-3 text-right">{rupiah(Number(x.jumlah))}</td>
              </tr>
            ))}
            {daftar.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-gray-500">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}