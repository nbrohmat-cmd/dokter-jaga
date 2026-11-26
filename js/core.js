/* core.js — API ke Google Apps Script, sesi, penyimpanan cache lokal, indeks data, utilitas tanggal & format.
   Prinsip cepat: tampilan selalu dirender dari data lokal (instan); server hanya disinkronkan di latar belakang. */
'use strict';
window.DJ = window.DJ || {};
(function (DJ) {
  const CFG = window.APP_CONFIG || {};
  /* registri halaman, status UI per halaman, dan aksi (dipakai pages-*.js sebelum app.js dimuat) */
  DJ.halaman = DJ.halaman || {};
  DJ.ui = DJ.ui || {};
  DJ.aksi = DJ.aksi || {};
  DJ.on = (n, fn) => { DJ.aksi[n] = fn; };

  /* ---------------- penyimpanan lokal (aman bila diblokir) ---------------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh/diblokir: abaikan */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  DJ.LS = LS;

  /* ---------------- tanggal ---------------- */
  const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const HARI3 = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI2 = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];
  const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const T = {
    HARI, HARI2, HARI3, BULAN, BULAN3,
    ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    today() { return T.ymd(new Date()); },
    utc(s) { const p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); },
    add(s, n) { return new Date(T.utc(s) + n * 864e5).toISOString().slice(0, 10); },
    diff(a, b) { return Math.round((T.utc(b) - T.utc(a)) / 864e5); },
    dow(s) { const d = new Date(T.utc(s)).getUTCDay(); return d === 0 ? 7 : d; },
    per(s) { return String(s).slice(0, 7); },
    shift(per, n) { const p = per.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1 + n, 1)).toISOString().slice(0, 7); },
    daysIn(per) { const p = per.split('-'); return new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate(); },
    dates(per) { const n = T.daysIn(per), o = []; for (let i = 1; i <= n; i++) o.push(per + '-' + pad(i)); return o; },
    fmt(s) { if (!s) return '-'; const p = s.split('-'); return HARI3[T.dow(s) - 1] + ', ' + (+p[2]) + ' ' + BULAN3[+p[1] - 1] + ' ' + p[0]; },
    fmtPendek(s) { const p = s.split('-'); return HARI3[T.dow(s) - 1] + ' ' + (+p[2]) + ' ' + BULAN3[+p[1] - 1]; },
    fmtPanjang(s) { const p = s.split('-'); return HARI[T.dow(s) - 1] + ', ' + (+p[2]) + ' ' + BULAN[+p[1] - 1] + ' ' + p[0]; },
    fmtPer(per) { const p = per.split('-'); return BULAN[+p[1] - 1] + ' ' + p[0]; },
    fmtPerPendek(per) { const p = per.split('-'); return BULAN3[+p[1] - 1] + ' ' + p[0].slice(2); },
    rel(iso) {
      if (!iso) return '';
      const t = new Date(iso.length <= 19 ? iso + '+07:00' : iso).getTime(), d = (Date.now() - t) / 1000;
      if (isNaN(d)) return '';
      if (d < 60) return 'baru saja'; if (d < 3600) return Math.floor(d / 60) + ' mnt lalu';
      if (d < 86400) return Math.floor(d / 3600) + ' jam lalu'; if (d < 86400 * 7) return Math.floor(d / 86400) + ' hari lalu';
      return T.fmt(iso.slice(0, 10));
    },
    salam() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
  };
  DJ.T = T;

  /* ---------------- format umum ---------------- */
  DJ.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  DJ.num = (x, dp) => { const f = Math.pow(10, dp == null ? 1 : dp); const r = Math.round((+x || 0) * f) / f; return String(r).replace('.', ','); };
  DJ.sel = (x) => { const r = Math.round((+x || 0) * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + String(Math.abs(r)).replace('.', ','); };
  DJ.inisial = (nama) => {
    const w = String(nama || '?').replace(/[^A-Za-z.\s]/g, ' ').trim().split(/\s+/);
    if (/^dr\.?$/i.test(w[0]) && w[1]) return ('D' + w[1][0]).toUpperCase();
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  };

  /* ---------------- sesi ---------------- */
  DJ.sesi = LS.get('dj_sesi', null);   // { token, user }
  DJ.simpanSesi = (s) => { DJ.sesi = s; if (s) LS.set('dj_sesi', s); else LS.del('dj_sesi'); };
  DJ.punya = (peran) => !!(DJ.sesi && DJ.sesi.user && DJ.sesi.user.peran.indexOf(peran) > -1);
  DJ.isAdmin = () => DJ.punya('ADMIN');
  DJ.isKepala = () => DJ.punya('KEPALA');
  DJ.isDokter = () => DJ.punya('DOKTER');
  DJ.isPengelola = () => DJ.isAdmin() || DJ.isKepala();
  DJ.uid = () => (DJ.sesi && DJ.sesi.user ? DJ.sesi.user.id : '');

  /* ---------------- API ---------------- */
  let sibuk = 0;
  const pendengarSibuk = [];
  DJ.onSibuk = (fn) => pendengarSibuk.push(fn);
  const ubahSibuk = (n) => { sibuk += n; pendengarSibuk.forEach((f) => f(sibuk)); };
  DJ.konfigOk = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(CFG.GAS_URL || '');

  DJ.api = async function (action, payload, opt) {
    opt = opt || {};
    if (!DJ.konfigOk()) throw { code: 'CONFIG', message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js' };
    const body = JSON.stringify({ action, payload: payload || {}, token: DJ.sesi ? DJ.sesi.token : '' });
    let percobaan = 0;
    ubahSibuk(1);
    try {
      for (;;) {
        const ctrl = new AbortController(), batas = setTimeout(() => ctrl.abort(), opt.timeout || 45000);
        try {
          const res = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow', signal: ctrl.signal });
          clearTimeout(batas);
          const j = await res.json();
          if (!j || typeof j.ok !== 'boolean') throw { code: 'BAD_RESPONSE', message: 'Server membalas tidak valid' };
          if (j.meta && j.meta.ver) DJ.verServer = j.meta.ver;
          if (!j.ok) {
            if (j.error.code === 'UNAUTHORIZED' && action !== 'auth.login') { DJ.simpanSesi(null); setTimeout(() => DJ.keLogin && DJ.keLogin(j.error.message), 0); }
            throw j.error;
          }
          return j.data;
        } catch (e) {
          clearTimeout(batas);
          if (e && e.code && e.code !== 'BAD_RESPONSE') throw e;
          // gangguan jaringan / tanggapan rusak: ulangi sekali untuk aksi baca
          if (percobaan++ < (opt.ulang == null ? (/^(app\.|jadwal\.bulan|beban\.|jadwal\.riwayat)/.test(action) ? 2 : 0) : opt.ulang)) { await new Promise((r) => setTimeout(r, 800 * percobaan)); continue; }
          throw (e && e.code) ? e : { code: 'NETWORK', message: navigator.onLine === false ? 'Anda sedang offline. Data yang tampil adalah salinan terakhir.' : 'Koneksi ke server bermasalah, coba lagi.' };
        }
      }
    } finally { ubahSibuk(-1); }
  };

  /* ---------------- data & indeks ---------------- */
  DJ.data = null;
  DJ.idx = {};
  DJ.bulanExtra = {};     // jadwal bulan di luar jendela bootstrap (dimuat saat dibuka)
  const kunciCache = () => 'dj_boot_' + DJ.uid();

  DJ.muatCache = () => { const d = LS.get(kunciCache(), null); if (d && d.ver) { DJ.pasangData(d, true); return true; } return false; };

  DJ.pasangData = function (d, dariCache) {
    DJ.data = d;
    const ix = DJ.idx = {};
    ix.user = {}; d.pengguna.forEach((u) => { ix.user[u.id] = u; });
    ix.dokter = d.pengguna.filter((u) => u.peran.indexOf('DOKTER') > -1)
      .sort((a, b) => (a.status === 'Tetap' ? 0 : 1) - (b.status === 'Tetap' ? 0 : 1) || a.nama.localeCompare(b.nama));
    ix.keg = {}; d.kegiatan.forEach((k) => { ix.keg[k.kode] = k; });
    ix.libur = {}; d.libur.forEach((l) => { ix.libur[l.t] = l; });
    ix.periode = {}; d.periode.forEach((p) => { ix.periode[p.per] = p; });
    ix.agenda = {}; d.agenda.forEach((a) => { ix.agenda[a.id] = a; });
    ix.jadwal = {}; ix.perBulan = {};
    d.jadwal.forEach((r) => { ix.jadwal[r.id] = r; (ix.perBulan[r.t.slice(0, 7)] = ix.perBulan[r.t.slice(0, 7)] || []).push(r); });
    Object.keys(DJ.bulanExtra).forEach((per) => { if (!DJ.dalamJendela(per)) DJ.bulanExtra[per].forEach((r) => { ix.jadwal[r.id] = r; }); });
    ix.berh = {}; d.berhalangan.forEach((b) => { (ix.berh[b.d] = ix.berh[b.d] || []).push(b); });
    ix.kelompok = {}; d.kelompok.forEach((k) => { ix.kelompok[k.kode] = k.label; });
    if (d.user && DJ.sesi) { DJ.sesi.user = Object.assign({}, DJ.sesi.user, d.user); DJ.simpanSesi(DJ.sesi); }
    if (!dariCache) LS.set(kunciCache(), d);
  };

  DJ.dalamJendela = (per) => DJ.data && per + '-01' >= DJ.data.jendela.dari && per + '-01' < DJ.data.jendela.sampai;
  /** Baris jadwal satu bulan (dari jendela bootstrap atau cache bulan tambahan); null bila perlu dimuat. */
  DJ.jadwalBulan = (per) => {
    if (DJ.dalamJendela(per)) return DJ.idx.perBulan[per] || [];
    return DJ.bulanExtra[per] || null;
  };
  const muatSedang = {};
  DJ.muatBulan = (per) => muatSedang[per] || (muatSedang[per] = muatBulanInti(per).finally(() => { delete muatSedang[per]; }));
  const muatBulanInti = async (per) => {
    const d = await DJ.api('jadwal.bulan', { periode: per });
    DJ.bulanExtra[per] = d.baris;
    d.baris.forEach((r) => { DJ.idx.jadwal[r.id] = r; });
    if (d.status) DJ.idx.periode[per] = Object.assign({ per }, DJ.idx.periode[per] || {}, { status: d.status });
    return d.baris;
  };

  /** Ambil bootstrap terbaru. Mengembalikan true bila data berubah. */
  DJ.segarkan = async (paksa) => {
    const p = paksa || !DJ.data ? {} : { ver: DJ.data.ver, uid: DJ.uid() };
    const d = await DJ.api('app.bootstrap', p);
    if (d.notModified) return false;
    DJ.bulanExtra = {};
    DJ.pasangData(d);
    return true;
  };

  /* ---------------- turunan domain ---------------- */
  const WARNA_DEF = { SB: '#2E9E5B', SJ: '#0E9F8E', 'TGC-P': '#E5A50A', 'TGC-S': '#EA7A1A', 'TGC-M': '#4F46A5', 'P3K-B': '#D9544D', 'P3K-L': '#D9544D', CUBER: '#8B5CF6', LPT: '#9AA6A0' };
  DJ.warna = (kode) => (DJ.idx.keg && DJ.idx.keg[kode] && DJ.idx.keg[kode].warna) || WARNA_DEF[kode] || '#1E7A4F';
  DJ.namaKeg = (kode) => (DJ.idx.keg && DJ.idx.keg[kode] ? DJ.idx.keg[kode].nama : kode === 'LPT' ? 'Libur Pasca TGC' : kode);
  DJ.kodePendek = (kode) => ({ 'TGC-P': 'TGC P', 'TGC-S': 'TGC S', 'TGC-M': 'TGC M', 'P3K-B': 'P3K', 'P3K-L': 'P3K', CUBER: 'CUB' }[kode] || kode);
  DJ.kelompokKeg = (kode) => { const k = DJ.idx.keg[kode]; if (!k) return 'Dalam Gedung'; if (kode.indexOf('TGC') === 0) return 'TGC'; return k.kelompok; };
  DJ.jam = (kode) => { const k = DJ.idx.keg[kode]; return k && k.jamMulai ? k.jamMulai.replace(':', '.') + '–' + (k.jamSelesai || '').replace(':', '.') : ''; };
  DJ.labelKel = (g) => DJ.idx.kelompok[g] || g;
  DJ.set = (k) => (DJ.data && DJ.data.pengaturan ? DJ.data.pengaturan[k] : '');
  DJ.lptAktif = () => DJ.set('LPT_Aktif') !== 'Tidak';
  DJ.nama = (id) => (DJ.idx.user && DJ.idx.user[id] ? DJ.idx.user[id].nama : DJ.sesi && DJ.sesi.user && DJ.sesi.user.id === id ? DJ.sesi.user.nama : id ? '(tidak dikenal)' : '—');
  DJ.statusPeriode = (per) => (DJ.idx.periode[per] ? DJ.idx.periode[per].status : 'Draf');

  DJ.sesiTgc = (t) => {
    const acuan = DJ.set('TGC_Tanggal_Acuan') || '2026-09-01', interval = +DJ.set('TGC_Interval_Hari') || 3;
    const urut = String(DJ.set('TGC_Urutan_Sesi') || 'P,S,M').split(','), i0 = Math.max(0, urut.indexOf(DJ.set('TGC_Sesi_Acuan') || 'P'));
    const d = T.diff(acuan, t);
    if (((d % interval) + interval) % interval !== 0) return null;
    const n = d / interval, L = urut.length;
    return urut[((i0 + n) % L + L) % L];
  };
  DJ.hariLibur = (t) => DJ.idx.libur[t] || null;
  DJ.akhirPekan = (t) => T.dow(t) >= 6;
  DJ.berhalangan = (id, t) => (DJ.idx.berh[id] || []).some((b) => t >= b.mulai && t <= (b.selesai || b.mulai));
  DJ.aktifPada = (u, t) => u && (!u.mulai || t >= u.mulai) && (!u.selesai || t <= u.selesai) && u.akun !== 'Nonaktif';

  /** Baris tampil: jadwal + penanda Libur Pasca TGC (turunan, tidak disimpan). */
  DJ.denganLpt = (rows) => {
    if (!DJ.lptAktif()) return rows.slice();
    const out = rows.slice();
    rows.forEach((r) => { if (r.k === 'TGC-M' && r.d && r.st !== 'Batal') out.push({ id: 'lpt-' + r.id, t: T.add(r.t, 1), k: 'LPT', d: r.d, st: 'LPT', asal: r.id }); });
    return out;
  };
  DJ.tugasPada = (t) => {
    const per = t.slice(0, 7), rows = DJ.jadwalBulan(per) || [];
    const prev = T.add(t, -1).slice(0, 7) !== per ? (DJ.jadwalBulan(T.add(t, -1).slice(0, 7)) || []).filter((r) => r.t === T.add(t, -1)) : [];
    return DJ.denganLpt(rows.concat(prev)).filter((r) => r.t === t);
  };
  DJ.urutKeg = (a, b) => ((DJ.idx.keg[a.k] || {}).urut || 50) - ((DJ.idx.keg[b.k] || {}).urut || 50);

  /** Status dokter pada tanggal t untuk kartu "Status Dokter Hari Ini". */
  DJ.statusDokter = (u, t) => {
    if (!DJ.aktifPada(u, t)) return { teks: 'Tidak aktif', cls: 'b-gray' };
    if (DJ.berhalangan(u.id, t)) return { teks: 'Berhalangan', cls: 'b-red' };
    const tugas = DJ.tugasPada(t).filter((r) => r.d === u.id && r.st !== 'Batal').sort(DJ.urutKeg);
    const nyata = tugas.filter((r) => r.k !== 'LPT');
    if (nyata.length) {
      const r = nyata[0], tgc = r.k.indexOf('TGC') === 0;
      return { teks: DJ.namaKeg(r.k).replace('Piket ', ''), cls: tgc ? 'b-orange' : r.k.indexOf('P3K') === 0 || r.k === 'CUBER' ? 'b-red' : 'b-green', row: r };
    }
    if (tugas.length) return { teks: 'Libur Pasca TGC', cls: 'b-gray' };
    if (DJ.hariLibur(t) || T.dow(t) === 7) return { teks: 'Libur', cls: 'b-slate' };
    return { teks: 'Dinas Pagi', cls: 'b-mint' };
  };
  DJ.tugasBerikut = (id, dari) => {
    const rows = Object.values(DJ.idx.jadwal).filter((r) => r.d === id && r.t > dari && (r.st === 'Terbit' || r.st === 'Draf'));
    rows.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : DJ.urutKeg(a, b)));
    return rows[0] || null;
  };

  /** Hitungan & target bulan berjalan (dari server untuk bulan ini; untuk bulan lain dihitung lokal). */
  DJ.rekapLokal = (per) => {
    const rows = (DJ.jadwalBulan(per) || []).filter((r) => r.d && (r.st === 'Terbit' || r.st === 'Draf' || r.st === 'Perlu Pengganti'));
    const N = {}, h = {}; let tot = 0;
    rows.forEach((r) => { N[r.kb] = (N[r.kb] || 0) + 1; if (r.tag) N[r.tag] = (N[r.tag] || 0) + 1; });
    const tgl = T.dates(per);
    DJ.idx.dokter.forEach((u) => { h[u.id] = tgl.filter((t) => DJ.aktifPada(u, t) && !DJ.berhalangan(u.id, t)).length; tot += h[u.id]; });
    const out = {};
    DJ.idx.dokter.forEach((u) => {
      const real = {}, target = {};
      rows.forEach((r) => { if (r.d !== u.id) return; real[r.kb] = (real[r.kb] || 0) + 1; if (r.tag) real[r.tag] = (real[r.tag] || 0) + 1; });
      Object.keys(N).forEach((g) => { target[g] = tot ? N[g] * h[u.id] / tot : 0; });
      out[u.id] = { real, target, hariAktif: h[u.id] };
    });
    return out;
  };

  /* ---------------- unduhan ---------------- */
  DJ.unduh = (nama, data, mime) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  DJ.b64ToBlob = (b64, mime) => { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); };

  /** Berkas .ics untuk satu atau banyak tugas. */
  DJ.ics = (rows) => {
    const st = (s) => String(s || '').replace(/[,;\\]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dokter Jaga//ID', 'CALSCALE:GREGORIAN'];
    rows.forEach((r) => {
      const k = DJ.idx.keg[r.k] || {}, tgl = r.t.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', 'UID:' + r.id + '@dokterjaga', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z');
      if (k.jamMulai && k.jamSelesai) {
        const a = k.jamMulai.replace(':', ''), b = k.jamSelesai.replace(':', ''), lewat = b <= a;
        lines.push('DTSTART;TZID=Asia/Jakarta:' + tgl + 'T' + a + '00', 'DTEND;TZID=Asia/Jakarta:' + (lewat ? T.add(r.t, 1).replace(/-/g, '') : tgl) + 'T' + b + '00');
      } else lines.push('DTSTART;VALUE=DATE:' + tgl, 'DTEND;VALUE=DATE:' + T.add(r.t, 1).replace(/-/g, ''));
      lines.push('SUMMARY:' + st('[' + DJ.namaKeg(r.k) + '] ' + DJ.nama(r.d)), 'LOCATION:' + st(r.lok || ''), 'DESCRIPTION:' + st('Jadwal jaga ' + (DJ.set('Nama_Puskesmas') || '')), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };
})(window.DJ);
