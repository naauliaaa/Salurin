'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Program = { id: number; nama: string }
type Baris = {
  id: number
  tanggal: string
  sumber_dana: string
  penerima: string
  jumlah_orang: number
  jumlah: number
  keterangan: string | null
  status: string
  program: { nama: string } | null
}
type Masuk = { jenis: string; jumlah: number }

const JENIS = ['Zakat', 'Infak', 'Sedekah']
const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n)

export default function PenyaluranPage() {
  const router = useRouter()
  const [peran, setPeran] = useState('')
  const [userId, setUserId] = useState('')
  const [program, setProgram] = useState<Program[]>([])
  const [daftar, setDaftar] = useState<Baris[]>([])
  const [masuk, setMasuk] = useState<Masuk[]>([])
  const [tanggal, setTanggal] = useState('')
  const [programId, setProgramId] = useState('')
  const [sumber, setSumber] = useState('Zakat')
  const [penerima, setPenerima] = useState('')
  useEffect(() => {
  setTanggal(new Date().toISOString().slice(0, 10))
}, [])
  const [orang, setOrang] = useState('1')
  const [jumlah, setJumlah] = useState('')
  const [ket, setKet] = useState('')
  const [pesan, setPesan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = useCallback(async () => {
    const { data: s } = await supabase
      .from('penyaluran')
      .select('id, tanggal, sumber_dana, penerima, jumlah_orang, jumlah, keterangan, status, program(nama)')
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false })
    setDaftar((s ?? []) as unknown as Baris[])
    const { data: m } = await supabase.from('penerimaan').select('jenis, jumlah')
    setMasuk((m ?? []) as unknown as Masuk[])
  }, [])

  useEffect(() => {
    async function awal() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUserId(user.id)
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

  // sisa saldo = ZIS masuk - semua penyaluran (termasuk yang masih menunggu)
  function sisa(j: string) {
    const m = masuk.filter((x) => x.jenis === j).reduce((t, x) => t + Number(x.jumlah), 0)
    const s = daftar.filter((x) => x.sumber_dana === j).reduce((t, x) => t + Number(x.jumlah), 0)
    return m - s
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault()
    setPesan('')
    const jml = Number(jumlah)
    if (!programId || !penerima.trim() || !(jml > 0)) {
      setPesan('Lengkapi program, penerima, dan jumlah yang benar.')
      return
    }
    if (jml > sisa(sumber)) {
      setPesan(`Saldo ${sumber} tidak cukup. Sisa saldo ${sumber}: ${rupiah(sisa(sumber))}.`)
      return
    }
    setMenyimpan(true)
    const { error } = await supabase.from('penyaluran').insert({
      tanggal,
      program_id: Number(programId),
      sumber_dana: sumber,
      penerima: penerima.trim(),
      jumlah_orang: Number(orang) || 1,
      jumlah: jml,
      keterangan: ket.trim() || null,
    })
    setMenyimpan(false)
    if (error) {
      setPesan('Gagal menyimpan: ' + error.message)
      return
    }
    setPenerima('')
    setJumlah('')
    setKet('')
    setPesan('Penyaluran diajukan, menunggu persetujuan.')
    await muat()
  }

  async function setujui(id: number) {
    const { error } = await supabase
      .from('penyaluran')
      .update({
        status: 'Disetujui',
        disetujui_oleh: userId,
        disetujui_pada: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) {
      setPesan('Gagal menyetujui: ' + error.message)
      return
    }
    setPesan('Penyaluran disetujui.')
    await muat()
  }

  const bolehInput = peran === 'admin' || peran === 'staf'
  const bolehSetujui = peran === 'admin' || peran === 'pengurus'

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penyaluran</h1>
          <p className="text-gray-600 text-sm">
            Sisa saldo: {JENIS.map((j) => `${j} ${rupiah(sisa(j))}`).join(' · ')}
          </p>
        </div>
        <Link href="/dashboard" className="border rounded-lg px-3 py-1.5">Kembali</Link>
      </div>

      {bolehInput && (
        <form onSubmit={kirim} className="border rounded-xl p-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Tanggal
            <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">Program
            <select required value={programId} onChange={(e) => setProgramId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2">
              <option value="">Pilih program</option>
              {program.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <label className="text-sm">Sumber dana
            <select value={sumber} onChange={(e) => setSumber(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2">
              {JENIS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </label>
          <label className="text-sm">Penerima (kelompok)
            <input required value={penerima} onChange={(e) => setPenerima(e.target.value)}
              placeholder="mis. Pasien dhuafa" className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">Jumlah orang
            <input type="number" min={1} required value={orang} onChange={(e) => setOrang(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm">Jumlah (Rp)
            <input type="number" min={1000} step={1000} required value={jumlah}
              onChange={(e) => setJumlah(e.target.value)} className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="text-sm sm:col-span-2">Keterangan
            <input value={ket} onChange={(e) => setKet(e.target.value)}
              placeholder="Bantuan untuk apa" className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <button disabled={menyimpan}
            className="sm:col-span-2 bg-emerald-700 text-white rounded-lg p-2 font-semibold">
            {menyimpan ? 'Menyimpan...' : 'Ajukan penyaluran'}
          </button>
        </form>
      )}

      {pesan && <p className="text-sm text-emerald-800">{pesan}</p>}

      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Tanggal</th><th className="p-3">Program</th>
              <th className="p-3">Penerima</th><th className="p-3">Sumber</th>
              <th className="p-3 text-right">Jumlah</th><th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((x) => (
              <tr key={x.id} className="border-t align-top">
                <td className="p-3">{x.tanggal}</td>
                <td className="p-3">{x.program?.nama}</td>
                <td className="p-3">
                  {x.penerima}
                  <div className="text-xs text-gray-500">{x.jumlah_orang} orang · {x.keterangan ?? '-'}</div>
                </td>
                <td className="p-3">{x.sumber_dana}</td>
                <td className="p-3 text-right">{rupiah(Number(x.jumlah))}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    x.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>{x.status}</span>
                </td>
                <td className="p-3">
                  {x.status !== 'Disetujui' && bolehSetujui && (
                    <button onClick={() => setujui(x.id)}
                      className="bg-emerald-700 text-white rounded-lg px-3 py-1 text-xs font-semibold">
                      Setujui
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {daftar.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-gray-500">Belum ada penyaluran.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}