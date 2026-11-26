/* pages-b.js — Transparansi Beban, Kelola Jadwal (admin), Agenda Luar Gedung, Berhalangan. */
'use strict';
(function (DJ) {
  const UI = DJ.UI, T = DJ.T, esc = DJ.esc, ic = UI.ic;
  const H = DJ.halaman = DJ.halaman || {};
  const ui = DJ.ui;
  const kelasSel = (s) => (Math.abs(s) <= 0.5 ? 'c-ok' : s > 0 ? 'c-up' : 'c-down');
  const KEL_INTI = [['SB', '#2E9E5B'], ['SJ', '#0E9F8E'], ['TGC-P', '#E5A50A'], ['TGC-S', '#EA7A1A'], ['TGC-M', '#4F46A5'], ['P3K', '#D9544D'], ['CUBER', '#8B5CF6']];

  /* ======================================================================
   * TRANSPARANSI BEBAN
   * ==================================================================== */
  ui.beban = { lingkup: 'kum', sampai: '', periode: '', cache: {} };
  function sumberBeban() {
    const st = ui.beban, b = DJ.data.beban;
    if (st.lingkup === 'bulan') {
      const per = st.periode || b.bulanIni.periode;
      if (per === b.bulanIni.periode) return { mode: 'bulan', per, dokter: b.bulanIni.dokter };
      const k = 'p' + per;
      if (!st.cache[k]) { st.cache[k] = 'muat'; DJ.api('beban.ringkasan', { periode: per }).then((d) => { st.cache[k] = d; DJ.render(); }).catch((e) => { delete st.cache[k]; UI.galat(e); }); }
      return st.cache[k] === 'muat' ? null : { mode: 'bulan', per, dokter: st.cache[k].dokter };
    }
    if (!st.sampai || st.sampai === b.sampai) return { mode: 'kum', data: b };
    const k = 's' + st.sampai;
    if (!st.cache[k]) { st.cache[k] = 'muat'; DJ.api('beban.ringkasan', { sampai: st.sampai }).then((d) => { st.cache[k] = d; DJ.render(); }).catch((e) => { delete st.cache[k]; UI.galat(e); }); }
    return st.cache[k] === 'muat' ? null : { mode: 'kum', data: st.cache[k] };
  }
  function daftarBulan() {
    const b = DJ.data.beban, out = [];
    let p = b.dari; const akhir = T.shift(DJ.data.hariIni.slice(0, 7), 3);
    while (p <= akhir && out.length < 60) { out.push(p); p = T.shift(p, 1); }
    return out.reverse();
  }
  H.beban = {
    render() {
      const st = ui.beban, b = DJ.data.beban, src = sumberBeban(), groups = b.kelompok;
      const bulan = daftarBulan();
      const pilihan = st.lingkup === 'bulan' ? UI.pillSel('beban-per', 'calendar_month', bulan.map((p) => [p, T.fmtPer(p)]), st.periode || b.bulanIni.periode, 'Bulan')
        : UI.pillSel('beban-sampai', 'date_range', bulan.filter((p) => p <= b.sampai || p <= DJ.data.hariIni.slice(0, 7)).map((p) => [p, T.fmtPer(b.dari) + ' – ' + T.fmtPer(p)]), st.sampai || b.sampai, 'Periode');
      let isi;
      if (!src) isi = '<section class="card">' + UI.sk(8) + '</section>';
      else {
        const rows = src.mode === 'kum' ? src.data.dokter : src.dokter;
        const tetap = rows.filter((d) => d.status === 'Tetap'), peng = rows.filter((d) => d.status !== 'Tetap');
        const sel = (d, g) => (d.real[g] || 0) - (d.target[g] || 0);
        const poin = (d) => (src.mode === 'kum' ? d.poin : d.poin || 0);
        const tabel = '<div class="mx-wrap"><table class="mx"><thead><tr><th>Dokter</th>' + groups.map((g) => '<th>' + esc(DJ.labelKel(g)) + '</th>').join('') + '<th style="text-align:right">Total poin</th></tr></thead><tbody>' +
          tetap.map((d) => '<tr><td class="nm">' + UI.who(d.id) + '</td>' + groups.map((g) => {
            const r = d.real[g] || 0, t = d.target[g] || 0, s = sel(d, g);
            return '<td class="cell ' + (r || t ? kelasSel(s) : 'c-na') + '" title="' + esc(DJ.labelKel(g) + ': realisasi ' + r + ', target ' + DJ.num(t) + ', selisih ' + DJ.sel(s)) + '"><b>' + r + '</b><small>t:' + DJ.num(t) + '</small></td>';
          }).join('') + '<td class="tot">' + DJ.num(poin(d)) + '</td></tr>').join('') + '</tbody></table></div>';
        const pengganti = peng.length ? '<div class="card" style="background:#F6F9F7;box-shadow:none;margin-top:16px"><div class="row sb" style="margin-bottom:10px"><b class="row" style="gap:6px">' + ic('group') + 'Dokter Pengganti</b><span class="small muted">Tidak termasuk dalam rata-rata dokter tetap</span></div><div class="grid g2">' +
          peng.map((d) => { const n = Object.keys(d.real).filter((g) => g.indexOf('TGC-') !== 0 || /^TGC-[PSM]$/.test(g)).reduce((a, g) => a + (d.real[g] || 0), 0); return '<div class="row sb" style="background:#fff;border-radius:12px;padding:10px 14px">' + UI.who(d.id, 'Pengganti' + ((DJ.idx.user[d.id] || {}).mulai ? ' · ' + T.fmtPendek(DJ.idx.user[d.id].mulai) + ' – ' + T.fmtPendek(DJ.idx.user[d.id].selesai || DJ.data.hariIni) : ''), 'sm') + '<div style="text-align:right"><b>' + n + ' tugas</b><div class="small muted">' + DJ.num(poin(d)) + ' poin</div></div></div>'; }).join('') + '</div></div>' : '';
        const tumpuk = UI.grafikTumpuk(tetap.map((d) => {
          const parts = KEL_INTI.map((k) => ({ nama: k[0] === 'P3K' ? 'P3K' : DJ.labelKel(k[0]), warna: k[1], nilai: k[0] === 'P3K' ? (d.real['P3K-B'] || 0) + (d.real['P3K-L'] || 0) : d.real[k[0]] || 0 }));
          const total = parts.reduce((a, p) => a + p.nilai, 0);
          return { label: DJ.nama(d.id), total, teksTotal: total + ' tugas', parts };
        }), KEL_INTI.map((k) => [k[0] === 'P3K' ? 'P3K' : DJ.labelKel(k[0]), k[1]]));
        const riw = (src.mode === 'kum' ? src.data.riwayat : b.riwayat).filter((x) => x.per >= T.shift(DJ.data.hariIni.slice(0, 7), -11));
        const akhir = riw.length ? riw[riw.length - 1].selisih : 0, awal = riw.length > 3 ? riw[riw.length - 4].selisih : riw.length ? riw[0].selisih : 0;
        isi = '<section class="card"><div class="card-h"><div><h2>Matriks Beban Dokter Tetap</h2><p>' + (src.mode === 'kum' ? 'Kumulatif termasuk saldo awal · ' + esc(T.fmtPer(src.data.dari)) + ' – ' + esc(T.fmtPer(src.data.sampai)) : 'Bulan ' + esc(T.fmtPer(src.per)) + ' · target sesuai hari aktif') + '</p></div>' +
          '<div class="legend"><span><i class="c-ok"></i>Sesuai target (±0,5)</span><span><i class="c-up"></i>Di atas target</span><span><i class="c-down"></i>Di bawah target</span></div></div>' + tabel + pengganti + '</section>' +
          '<div class="grid g-7-5" style="margin-top:20px"><section class="card"><div class="card-h"><div><h2>Distribusi Beban per Aktivitas</h2><p>Komposisi tugas per jenis kegiatan</p></div></div>' + tumpuk + '</section>' +
          '<section class="card"><div class="card-h"><div><h2>Riwayat selisih per bulan</h2><p>Rata-rata rentang selisih antar-dokter tetap</p></div>' + (riw.length > 1 && akhir < awal - 0.05 ? UI.badge('Makin merata (3 bulan)', 'b-green') : riw.length > 1 && akhir > awal + 0.05 ? UI.badge('Melebar (3 bulan)', 'b-amber') : '') + '</div>' +
          UI.grafikGaris(riw.map((x) => ({ label: T.fmtPerPendek(x.per).split(' ')[0], nilai: x.selisih })), { judul: 'Riwayat selisih' }) +
          '<div class="row sb" style="background:#F4F7F5;border-radius:10px;padding:10px 14px;margin-top:12px"><span class="small muted">Selisih saat ini</span><b>' + DJ.num(akhir, 2) + ' tugas</b></div></section></div>';
      }
      return '<div class="page-h"><div><div class="eyebrow">Evaluasi pemerataan jadwal</div><h1>Transparansi Beban</h1></div><div class="row">' +
        UI.seg('beban-lingkup', [['bulan', 'Bulan ini'], ['kum', 'Kumulatif']], st.lingkup, 'green') + pilihan +
        '<button class="btn" data-act="beban-xlsx">' + ic('download') + 'Excel</button></div></div>' +
        '<div class="callout" style="margin-bottom:20px">' + ic('verified_user') + '<p>Angka dihitung langsung dari jadwal dan tidak bisa diubah manual. Target pemerataan menyesuaikan hari aktif tiap dokter (cuti, pelatihan, dan masa pengganti diperhitungkan).</p></div>' + isi;
    }
  };
  DJ.on('beban-lingkup', (el) => { ui.beban.lingkup = el.dataset.v; DJ.render(); });
  DJ.on('beban-per', (el) => { ui.beban.periode = el.value; DJ.render(); });
  DJ.on('beban-sampai', (el) => { ui.beban.sampai = el.value; DJ.render(); });
  DJ.on('beban-xlsx', () => {
    const src = sumberBeban(); if (!src) return;
    const groups = DJ.data.beban.kelompok, rows = src.mode === 'kum' ? src.data.dokter : src.dokter;
    const kolom = ['Dokter', 'Status'].concat(...groups.map((g) => [DJ.labelKel(g) + ' (realisasi)', DJ.labelKel(g) + ' (target)', DJ.labelKel(g) + ' (selisih)'])).concat(['Total poin']);
    const baris = rows.map((d) => [DJ.nama(d.id), d.status || ''].concat(...groups.map((g) => [d.real[g] || 0, Math.round((d.target[g] || 0) * 10) / 10, Math.round(((d.real[g] || 0) - (d.target[g] || 0)) * 10) / 10])).concat([d.poin || 0]));
    const judul = src.mode === 'kum' ? 'Kumulatif sd ' + src.data.sampai : 'Bulan ' + src.per;
    DJ.unduh('Rekap Beban ' + judul + '.xlsx', DJ.xlsx([{ nama: 'Rekap Beban', kolom, baris, lebar: [22, 10].concat(groups.map(() => [12, 10, 10]).flat(), [10]) }]));
  });

  /* ======================================================================
   * KELOLA JADWAL (matriks dokter × tanggal)
   * ==================================================================== */
  ui.kelola = ui.kelola || {};
  function perAwal() {
    const h = DJ.data.hariIni, depan = T.shift(h.slice(0, 7), 1);
    return +h.slice(8) >= 10 && DJ.statusPeriode(depan) === 'Draf' ? depan : h.slice(0, 7);
  }
  function rekapRows(rows, per) {
    const N = {}, h = {}, out = {}; let tot = 0;
    rows.forEach((r) => { if (!r.d) return; N[r.kb] = (N[r.kb] || 0) + 1; });
    DJ.idx.dokter.forEach((u) => { h[u.id] = T.dates(per).filter((t) => DJ.aktifPada(u, t) && !DJ.berhalangan(u.id, t)).length; tot += h[u.id]; });
    DJ.idx.dokter.forEach((u) => {
      const c = { SB: 0, SJ: 0, TGC: 0, tot: 0 };
      rows.forEach((r) => { if (r.d !== u.id) return; c.tot++; if (r.k === 'SB') c.SB++; else if (r.k === 'SJ') c.SJ++; else if (r.k.indexOf('TGC') === 0) c.TGC++; });
      const tg = (g) => (tot ? (N[g] || 0) * h[u.id] / tot : 0);
      c.tSB = tg('SB'); c.tSJ = tg('SJ'); c.tTGC = tg('TGC-P') + tg('TGC-S') + tg('TGC-M');
      c.tTot = Object.keys(N).reduce((a, g) => a + tg(g), 0);
      out[u.id] = c;
    });
    return out;
  }
  const sumSel = (n, t) => { const s = Math.round((n - t) * 10) / 10; return '<small class="' + (Math.abs(s) <= 0.5 ? 'zero' : s > 0 ? 'pos' : 'neg') + '">' + (Math.abs(s) <= 0.5 ? '✓' : DJ.sel(s)) + '</small>'; };

  H.kelola = {
    render() {
      const st = ui.kelola, hari = DJ.data.hariIni;
      if (!st.per) st.per = perAwal();
      const per = st.per, status = DJ.statusPeriode(per), admin = DJ.isAdmin();
      let rows = DJ.jadwalBulan(per);
      if (rows === null) { DJ.muatBulan(per).then(DJ.render).catch(UI.galat); }
      const usulan = st.usulan && st.usulan.periode === per ? st.usulan : null;
      const tampil = usulan ? usulan.baris : (rows || []).filter((r) => r.st !== 'Batal');
      const prevTgcM = (DJ.jadwalBulan(T.shift(per, -1)) || []).filter((r) => r.k === 'TGC-M' && r.t === T.add(per + '-01', -1));
      const denganLpt = DJ.denganLpt(tampil.concat(prevTgcM)).filter((r) => r.t.slice(0, 7) === per);
      const lama = {}; (rows || []).forEach((r) => { if (r.st !== 'Batal') lama[r.t + '|' + r.k + '|' + r.d] = 1; });
      const salah = {}; if (st.validasi && st.validasi.per === per) st.validasi.masalah.forEach((m) => { salah[m.id] = m.sifat; });
      const tgl = T.dates(per);
      const dokter = DJ.idx.dokter.filter((u) => tgl.some((t) => DJ.aktifPada(u, t)) || tampil.some((r) => r.d === u.id));
      const sel = {}; denganLpt.forEach((r) => { const k = (r.d || '_') + '|' + r.t; (sel[k] = sel[k] || []).push(r); });
      const rek = rekapRows(tampil, per);
      const kosongAda = tampil.some((r) => !r.d || r.st === 'Perlu Pengganti');
      const chipSel = (r) => {
        if (r.k === 'LPT') return UI.chip('LPT', { teks: 'LPT', title: 'Libur Pasca TGC Malam' });
        const cls = (!r.d ? 'empty ' : r.st === 'Perlu Pengganti' ? 'need ' : '') + (usulan && !lama[r.t + '|' + r.k + '|' + r.d] ? 'chg ' : '') + (salah[r.id] === 'Wajib' ? 'bad' : '');
        return UI.chip(r.k, { teks: DJ.kodePendek(r.k).replace('TGC ', 'TGC ') + (salah[r.id] ? ' ⚠' : ''), cls, title: DJ.namaKeg(r.k) + (r.al ? ' — ' + r.al : '') });
      };
      const head = '<tr><th class="sticky">Dokter</th>' + tgl.map((t) => { const L = DJ.hariLibur(t); return '<th class="' + (L ? 'hol' : DJ.akhirPekan(t) ? 'we' : '') + (t === hari ? ' today' : '') + '" title="' + esc(L ? L.ket : T.fmtPanjang(t)) + '"><b>' + (+t.slice(8)) + '</b>' + T.HARI2[T.dow(t) - 1] + '</th>'; }).join('') + '<th>SB</th><th>SJ</th><th>TGC</th><th>Total</th></tr>';
      const baris = dokter.map((u) => {
        const c = rek[u.id];
        return '<tr><td class="sticky">' + UI.who(u.id, esc(u.status === 'Pengganti' ? 'Pengganti' : 'Dokter Tetap'), 'sm') + '</td>' + tgl.map((t) => {
          const L = DJ.hariLibur(t), isi = (sel[u.id + '|' + t] || []).sort(DJ.urutKeg);
          const tidak = !DJ.aktifPada(u, t) ? ' style="background:repeating-linear-gradient(45deg,#fafafa,#fafafa 4px,#f0f0f0 4px,#f0f0f0 8px)"' : DJ.berhalangan(u.id, t) ? ' style="background:#FFF4F4"' : '';
          return '<td class="cl ' + (L ? 'hol' : DJ.akhirPekan(t) ? 'we' : '') + '" data-act="kel-hari" data-t="' + t + '"' + tidak + ' title="' + esc(u.nama + ' · ' + T.fmt(t) + (DJ.berhalangan(u.id, t) ? ' · berhalangan' : '')) + '">' + isi.map(chipSel).join('') + '</td>';
        }).join('') + '<td class="sum"><b>' + c.SB + '</b>' + sumSel(c.SB, c.tSB) + '</td><td class="sum"><b>' + c.SJ + '</b>' + sumSel(c.SJ, c.tSJ) + '</td><td class="sum"><b>' + c.TGC + '</b>' + sumSel(c.TGC, c.tTGC) + '</td><td class="sum"><b>' + c.tot + '</b>' + sumSel(c.tot, c.tTot) + '</td></tr>';
      }).join('') + (kosongAda ? '<tr class="unfilled"><td class="sticky"><div class="who"><span class="av sm" style="--c:#DC4C4C">' + ic('person_alert') + '</span><div><b>Belum terisi</b><small>Perlu petugas</small></div></div></td>' +
        tgl.map((t) => '<td class="cl" data-act="kel-hari" data-t="' + t + '">' + tampil.filter((r) => r.t === t && (!r.d || r.st === 'Perlu Pengganti')).map((r) => UI.chip(r.k, { cls: r.d ? 'need' : 'empty', teks: DJ.kodePendek(r.k), title: r.d ? 'Perlu pengganti: ' + DJ.nama(r.d) : 'Belum terisi' })).join('') + '</td>').join('') + '<td class="sum" colspan="4"></td></tr>' : '');

      const tombol = [];
      if (admin && status === 'Draf') tombol.push('<button class="btn" data-act="kel-susun">' + ic('auto_awesome') + 'Susun Otomatis</button>');
      tombol.push('<button class="btn ghost" data-act="kel-validasi">' + ic('fact_check') + 'Validasi</button>');
      if (status === 'Terbit') tombol.push('<button class="btn ghost" data-act="kel-kunci">' + ic('lock') + 'Kunci Bulan</button>');
      if (admin && status === 'Dikunci') tombol.push('<button class="btn ghost" data-act="kel-buka">' + ic('lock_open') + 'Buka Kunci</button>');
      tombol.push('<button class="btn ghost" data-act="kel-pdf">' + ic('picture_as_pdf') + 'PDF</button>');
      if (admin && status === 'Draf') tombol.push('<button class="btn pri" data-act="kel-terbit"' + (usulan ? ' disabled' : '') + '>' + ic('publish') + 'Terbitkan</button>');

      let panel = '';
      if (usulan) {
        panel = '<section class="card preview" style="margin-bottom:20px"><div class="row sb" style="align-items:flex-start"><div class="row" style="align-items:flex-start;gap:14px"><span class="kpi"><span class="ic">' + ic('auto_awesome') + '</span></span><div><h2 style="font-size:17px">Pratinjau Susun Otomatis ' + UI.badge(usulan.perubahan + ' perubahan', 'b-green') + '</h2>' +
          '<p class="muted small" style="margin:4px 0 0;max-width:62ch">Sel yang berubah ditandai garis hijau. Penugasan memilih dokter dengan kekurangan terbesar per kelompok, dengan memperhitungkan saldo kumulatif dan hari aktif.' + (usulan.dipertahankan ? ' ' + usulan.dipertahankan + ' penugasan manual dipertahankan.' : '') + (usulan.tanpaPetugas ? ' <b style="color:#B42318">' + usulan.tanpaPetugas + ' slot tidak bisa diisi.</b>' : '') + '</p></div></div>' +
          '<div class="row"><button class="btn" data-act="kel-batal">Batal</button><button class="btn pri" data-act="kel-terapkan">' + ic('check') + 'Terapkan</button></div></div>' +
          '<div class="row" style="margin-top:14px;gap:8px">' + usulan.laporan.map((l) => '<span class="badge ' + (l.selisihMaks <= 1.05 ? 'b-green' : 'b-amber') + '" title="Rentang selisih antar-dokter tetap setelah bulan ini (termasuk ketimpangan lama)">' + esc(l.label) + ': ' + l.slot + ' slot · selisih kumulatif ' + DJ.num(l.selisihMaks) + '</span>').join('') + '</div></section>';
      }
      if (st.validasi && st.validasi.per === per) {
        const v = st.validasi, wajib = v.masalah.filter((m) => m.sifat === 'Wajib'), per2 = v.masalah.filter((m) => m.sifat !== 'Wajib');
        panel += '<section class="card" style="margin-bottom:20px"><div class="card-h"><h3>' + ic('fact_check') + ' Hasil validasi</h3><button class="ico-btn" data-act="kel-tutup-val" aria-label="Tutup">' + ic('close') + '</button></div>' +
          (!v.masalah.length && !v.kosong.length ? '<div class="callout">' + ic('check_circle') + '<p>Tidak ada pelanggaran aturan dan semua slot terisi.</p></div>' :
            '<div class="list">' + wajib.concat(per2).map((m) => '<div class="li click" data-act="kel-hari" data-t="' + m.t + '">' + UI.badge(m.kode + ' · ' + m.sifat, m.sifat === 'Wajib' ? 'b-red' : 'b-amber') + '<div class="grow"><b>' + esc(T.fmt(m.t)) + ' · ' + esc(DJ.nama(m.d)) + '</b><div class="small muted">' + esc(m.pesan) + '</div></div>' + ic('chevron_right', 'muted') + '</div>').join('') +
            v.kosong.map((k) => '<div class="li click" data-act="kel-hari" data-t="' + k.t + '">' + UI.badge('Slot kosong', 'b-red') + '<div class="grow"><b>' + esc(T.fmt(k.t)) + '</b><div class="small muted">' + esc(DJ.namaKeg(k.k)) + ' belum punya petugas</div></div>' + ic('chevron_right', 'muted') + '</div>').join('') + '</div>') + '</section>';
      }
      const nKonflik = Object.keys(salah).length;
      const html = '<div class="card" style="margin-bottom:20px;padding:14px 16px"><div class="row sb"><div class="row"><div class="datenav"><button class="ico-btn" data-act="kel-geser" data-n="-1" aria-label="Bulan sebelumnya">' + ic('chevron_left') + '</button><b>' + ic('calendar_month') + ' ' + esc(T.fmtPer(per)) + '</b><button class="ico-btn" data-act="kel-geser" data-n="1" aria-label="Bulan berikutnya">' + ic('chevron_right') + '</button></div>' + UI.statusBadge(status) + '</div>' +
        '<div class="row">' + tombol.join('') + '</div></div></div>' + panel +
        '<section class="card" style="padding:16px"><div class="card-h"><div class="row"><h2>Matriks Jadwal Jaga</h2><span class="small muted">' + dokter.length + ' dokter · ' + tgl.length + ' hari</span></div>' +
        (nKonflik ? UI.badge(nKonflik + ' konflik terdeteksi', 'b-red', 'warning') : status === 'Dikunci' ? UI.badge('Terkunci — tidak bisa diubah', 'b-blue', 'lock') : !admin ? UI.badge('Hanya lihat', 'b-slate', 'visibility') : '<span class="small muted">Klik sel untuk mengubah</span>') + '</div>' +
        (rows === null && !usulan ? UI.sk(8) : '<div class="roster-wrap"><table class="roster"><thead>' + head + '</thead><tbody>' + baris + '</tbody></table></div>') +
        '<div class="legend" style="margin-top:14px"><b style="color:var(--teks)">Keterangan:</b>' + [['SB', 'Piket Sore Biasa'], ['SJ', 'Piket Sore Jumat'], ['TGC-P', 'TGC Pagi'], ['TGC-S', 'TGC Siang'], ['TGC-M', 'TGC Malam'], ['P3K-B', 'P3K'], ['CUBER', 'Cuber'], ['LPT', 'Libur Pasca TGC']].map((x) => '<span>' + UI.chip(x[0]) + x[1] + '</span>').join('') +
        '<span><i style="background:#FFF1F1;border:1px solid #F5C2C2"></i>Hari libur</span><span>✓ / ± selisih terhadap target bulan ini</span></div></section>';
      if (st.bukaTgl && st.bukaTgl.slice(0, 7) === per && rows !== null) { const t = st.bukaTgl; st.bukaTgl = null; setTimeout(() => DJ.hariKelola(t), 50); }
      return html;
    }
  };
  DJ.on('kel-geser', (el) => { const st = ui.kelola; st.per = T.shift(st.per, +el.dataset.n); st.usulan = null; DJ.render(); });
  DJ.on('kel-tutup-val', () => { ui.kelola.validasi = null; DJ.render(); });
  DJ.on('kel-susun', (el) => UI.sibuk(el, async () => {
    const st = ui.kelola, rows = DJ.jadwalBulan(st.per) || [];
    if (rows.some((r) => r.src === 'Otomatis' && r.st !== 'Batal') && !(await UI.konfirmasi({ judul: 'Susun ulang?', pesan: 'Penugasan otomatis bulan ini akan diganti dengan susunan baru. Penugasan manual tetap dipertahankan.', ok: 'Susun ulang' }))) return;
    try { const d = await DJ.api('jadwal.susun', { periode: st.per }); st.usulan = d; st.validasi = null; DJ.render(); UI.toast('Pratinjau siap: ' + d.perubahan + ' perubahan'); }
    catch (e) { UI.galat(e); }
  }));
  DJ.on('kel-batal', () => { ui.kelola.usulan = null; DJ.render(); });
  DJ.on('kel-terapkan', async (el) => { try { await DJ.ubah(el, 'jadwal.terapkan', { periode: ui.kelola.per }, 'Susunan diterapkan sebagai Draf'); ui.kelola.usulan = null; DJ.render(); } catch (e) { if (e.code === 'EXPIRED') { ui.kelola.usulan = null; DJ.render(); } } });
  DJ.on('kel-validasi', (el) => UI.sibuk(el, async () => {
    try { const v = await DJ.api('jadwal.validasi', { periode: ui.kelola.per }); v.per = ui.kelola.per; ui.kelola.validasi = v; DJ.render(); UI.toast(v.masalah.length || v.kosong.length ? (v.wajib + ' wajib · ' + (v.masalah.length - v.wajib) + ' peringatan · ' + v.kosong.length + ' slot kosong') : 'Jadwal valid', v.wajib || v.kosong.length ? 'warn' : 'ok'); }
    catch (e) { UI.galat(e); }
  }));
  DJ.on('kel-terbit', async (el) => {
    const per = ui.kelola.per;
    if (!(await UI.konfirmasi({ judul: 'Terbitkan jadwal ' + T.fmtPer(per) + '?', htmlPesan: 'Semua dokter akan menerima email (dan WA bila aktif), dan jadwal muncul di Google Calendar masing-masing dalam beberapa menit.<br><br>Setelah terbit, perubahan dilakukan per sel atau lewat tukar jaga.', ok: 'Terbitkan' }))) return;
    try { await DJ.ubah(el, 'jadwal.terbitkan', { periode: per }, 'Jadwal ' + T.fmtPer(per) + ' terbit'); ui.kelola.validasi = null; } catch (e) { /* sudah tampil */ }
  });
  DJ.on('kel-kunci', async (el) => {
    const per = ui.kelola.per;
    if (!(await UI.konfirmasi({ judul: 'Kunci ' + T.fmtPer(per) + '?', pesan: 'Rekap bulan ini disimpan permanen. Jadwal tidak bisa diubah atau ditukar lagi kecuali Admin membuka kunci.', ok: 'Kunci bulan' }))) return;
    try { await DJ.ubah(el, 'jadwal.kunci', { periode: per }, 'Bulan dikunci & rekap tersimpan'); } catch (e) { }
  });
  DJ.on('kel-buka', async (el) => {
    const alasan = await UI.minta({ judul: 'Buka kunci ' + T.fmtPer(ui.kelola.per) + '?', label: 'Alasan membuka kunci', wajib: true, ok: 'Buka kunci' });
    if (alasan === null) return;
    try { await DJ.ubah(el, 'jadwal.bukaKunci', { periode: ui.kelola.per, alasan }, 'Kunci dibuka'); } catch (e) { }
  });
  DJ.on('kel-pdf', (el) => {
    const per = ui.kelola.per, st = DJ.statusPeriode(per);
    const items = [{ ikon: 'draft', teks: 'Cetak draf PDF', fn: () => cetakJadwal(el, per, false) }];
    if (DJ.isKepala() && st !== 'Draf') items.unshift({ ikon: 'verified', teks: 'Sahkan & cetak (ber-QR)', fn: () => cetakJadwal(el, per, true) });
    UI.menu(el, items);
  });
  async function cetakJadwal(el, per, sahkan) {
    await UI.sibuk(el, async () => {
      try { const r = await DJ.api('laporan.pdfJadwal', { periode: per, sahkan }, { timeout: 90000 }); UI.bukaPdf(r); UI.toast(sahkan ? 'PDF disahkan & tersimpan di Drive' : 'PDF draf dibuat'); }
      catch (e) { UI.galat(e); }
    });
  }
  DJ.cetakJadwal = cetakJadwal;

  /* ---------- laci per tanggal: ubah penugasan ---------- */
  DJ.on('kel-hari', (el) => DJ.hariKelola(el.dataset.t));
  DJ.hariKelola = (t) => {
    const per = t.slice(0, 7), status = DJ.statusPeriode(per), admin = DJ.isAdmin();
    const usulan = ui.kelola.usulan && ui.kelola.usulan.periode === per;
    const bisaUbah = admin && status !== 'Dikunci' && !usulan;
    const rows = (DJ.jadwalBulan(per) || []).filter((r) => r.t === t && r.st !== 'Batal').sort(DJ.urutKeg);
    const dokOpsi = (pilih) => '<option value="">— kosongkan —</option>' + DJ.idx.dokter.map((u) => {
      const ok = DJ.aktifPada(u, t) && !DJ.berhalangan(u.id, t);
      return '<option value="' + u.id + '"' + (u.id === pilih ? ' selected' : '') + (ok || u.id === pilih ? '' : ' disabled') + '>' + esc(u.nama) + (ok ? '' : ' (tidak tersedia)') + '</option>';
    }).join('');
    const L = DJ.hariLibur(t);
    const kegBaru = DJ.data.kegiatan.filter((k) => k.aktif && k.kode !== 'LPT');
    const isi = (L ? '<div class="callout bad">' + ic('event_busy') + '<p><b>' + esc(L.jenis) + ':</b> ' + esc(L.ket) + (L.cuber ? ' · ada piket Cuber' : '') + '</p></div>' : '') +
      (!bisaUbah ? '<div class="callout info">' + ic('info') + '<p>' + (usulan ? 'Terapkan atau batalkan pratinjau susun otomatis dulu.' : status === 'Dikunci' ? 'Bulan ini terkunci.' : 'Hanya Admin yang dapat mengubah jadwal.') + '</p></div>' : status === 'Terbit' ? '<div class="callout warn">' + ic('campaign') + '<p>Jadwal sudah terbit: perubahan langsung dikirim ke dokter terkait dan Google Calendar.</p></div>' : '') +
      (rows.length ? rows.map((r) => '<div class="card" style="box-shadow:none;padding:14px;display:grid;gap:10px" data-row="' + r.id + '"><div class="row sb"><div class="row">' + UI.chip(r.k, { cls: 'solid' }) + '<b>' + esc(DJ.namaKeg(r.k)) + '</b></div>' + UI.statusBadge(r.st) + '</div>' +
        (r.al ? '<div class="small muted">' + esc(r.al) + '</div>' : '') +
        (bisaUbah ? '<div class="row"><select class="inp" style="flex:1;min-width:180px" data-dok>' + dokOpsi(r.d) + '</select><button class="btn sm pri" data-k="simpan" data-id="' + r.id + '">Simpan</button></div>' +
          '<div class="row">' + (r.st === 'Perlu Pengganti' || !r.d ? '<button class="btn xs" data-k="saran" data-id="' + r.id + '">' + ic('person_search') + 'Saran pengganti</button>' : '') + '<button class="btn xs danger-o" data-k="hapus" data-id="' + r.id + '">' + ic('delete') + 'Hapus slot</button></div><div data-saran></div>'
          : '<div>' + (r.d ? UI.who(r.d) : '<b style="color:#B42318">Belum terisi</b>') + '</div>') + '</div>').join('') : UI.empty('event_available', 'Tidak ada jadwal pada tanggal ini')) +
      (bisaUbah ? '<details class="card" style="box-shadow:none;padding:14px"><summary style="cursor:pointer;font-weight:600">' + ic('add') + ' Tambah slot manual</summary><div class="form-grid" style="margin-top:12px"><div class="field"><label>Kegiatan</label><select class="inp" id="tbKode">' + kegBaru.map((k) => '<option value="' + k.kode + '">' + esc(k.nama) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Dokter</label><select class="inp" id="tbDok">' + dokOpsi('') + '</select></div><div class="full row end"><button class="btn sm pri" data-k="tambah">Tambah</button></div></div></details>' : '');
    const laci = UI.laci({ judul: T.fmtPanjang(t), ikon: 'edit_calendar', isi });
    const kirimUbah = async (btn, payload, pesan) => {
      const alasan = await UI.minta({ judul: 'Alasan perubahan', label: 'Alasan', wajib: true, placeholder: 'Mis. permintaan dokter, menyeimbangkan beban', ok: 'Simpan' });
      if (alasan === null) return;
      payload.alasan = alasan;
      try {
        let r = await DJ.api('jadwal.ubah', payload);
        if (r.perluKonfirmasi) {
          if (!(await UI.konfirmasi({ judul: 'Ada peringatan aturan', htmlPesan: r.peringatan.map((m) => '• <b>' + esc(m.kode) + '</b> ' + esc(m.pesan)).join('<br>') + '<br><br>Tetap simpan?', ok: 'Tetap simpan' }))) return;
          payload.paksa = true; r = await DJ.api('jadwal.ubah', payload);
        }
        try { await DJ.segarkan(); } catch (e) { }
        laci.tutup(); DJ.render(); UI.toast(pesan);
      } catch (e) { UI.galat(e); }
    };
    laci.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k, card = b.closest('[data-row]');
      if (k === 'simpan') await UI.sibuk(b, () => kirimUbah(b, { id: b.dataset.id, idDokter: card.querySelector('[data-dok]').value }, 'Penugasan diperbarui'));
      else if (k === 'hapus') {
        if (!(await UI.konfirmasi({ judul: 'Hapus slot ini?', pesan: 'Slot akan dibatalkan dan tidak dihitung sebagai beban.', ok: 'Hapus', bahaya: true }))) return;
        await UI.sibuk(b, () => kirimUbah(b, { id: b.dataset.id, hapus: true }, 'Slot dihapus'));
      } else if (k === 'tambah') {
        await UI.sibuk(b, () => kirimUbah(b, { tanggal: t, kode: laci.el.querySelector('#tbKode').value, idDokter: laci.el.querySelector('#tbDok').value }, 'Slot ditambahkan'));
      } else if (k === 'saran') {
        await UI.sibuk(b, async () => {
          try {
            const d = await DJ.api('jadwal.saranPengganti', { id: b.dataset.id });
            card.querySelector('[data-saran]').innerHTML = '<div class="small muted" style="margin:4px 0">Urut dari yang paling kurang di kelompok ini:</div>' + d.saran.map((x) => '<button type="button" class="opt' + (x.boleh ? '' : ' no') + '" style="margin-top:6px" data-k="pilih" data-u="' + x.id + '"' + (x.boleh ? '' : ' disabled') + '>' + UI.av(x.id, 'sm') + '<div class="grow"><b>' + esc(x.nama) + '</b><div class="small muted">' + esc(x.kelompok + ' selisih ' + DJ.sel(x.selisih)) + (x.catatan.length ? ' · ' + esc(x.catatan.join('; ')) : '') + '</div></div></button>').join('');
          } catch (er) { UI.galat(er); }
        });
      } else if (k === 'pilih') { card.querySelector('[data-dok]').value = b.dataset.u; card.querySelector('[data-k="simpan"]').focus(); UI.toast('Dipilih ' + DJ.nama(b.dataset.u) + '. Tekan Simpan.', 'info'); }
    });
  };

  /* ======================================================================
   * AGENDA LUAR GEDUNG
   * ==================================================================== */
  ui.agenda = { lingkup: 'akan' };
  H.agenda = {
    render() {
      const st = ui.agenda, hari = DJ.data.hariIni, admin = DJ.isAdmin();
      const list = DJ.data.agenda.filter((a) => (st.lingkup === 'akan' ? a.t >= hari && a.status !== 'Batal' : st.lingkup === 'lalu' ? a.t < hari : a.status === 'Batal'))
        .sort((a, b) => (st.lingkup === 'akan' ? (a.t < b.t ? -1 : 1) : (a.t < b.t ? 1 : -1)));
      const petugas = (a) => Object.values(DJ.idx.jadwal).filter((r) => r.ag === a.id && r.st !== 'Batal' && r.d);
      const tabel = list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Acara</th><th class="hide-m">Lokasi</th><th>Petugas</th><th>Status</th>' + (admin ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map((a) => {
        const p = petugas(a);
        return '<tr><td style="white-space:nowrap"><b>' + esc(T.fmtPendek(a.t)) + '</b><div class="small muted">' + esc(a.jamMulai ? a.jamMulai + '–' + (a.jamSelesai || '') : a.t.slice(0, 4)) + '</div></td>' +
          '<td><b>' + esc(a.nama) + '</b><div class="row" style="gap:6px;margin-top:4px">' + UI.chip(a.jenis === 'Cuber' ? 'CUBER' : a.kategori === 'Libur' ? 'P3K-L' : 'P3K-B', { teks: a.jenis === 'Cuber' ? 'Cuber' : 'P3K ' + a.kategori }) + (a.surat ? '<span class="small muted">' + esc(a.surat) + '</span>' : '') + '</div></td>' +
          '<td class="hide-m">' + esc(a.lok || '-') + (a.penyelenggara ? '<div class="small muted">' + esc(a.penyelenggara) + '</div>' : '') + '</td>' +
          '<td>' + (p.length ? '<div class="av-stack">' + p.map((r) => UI.av(r.d, 'sm')).join('') + '</div><div class="small muted">' + p.map((r) => esc((DJ.idx.user[r.d] || {}).singkat || '')).join(', ') + '</div>' : '<span class="small" style="color:#B42318">Belum ditugaskan (0/' + a.jumlah + ')</span>') + '</td>' +
          '<td>' + UI.statusBadge(a.status) + '</td>' + (admin ? '<td class="acts">' + (a.status !== 'Batal' && a.status !== 'Selesai' ? '<button class="btn sm' + (p.length < a.jumlah ? ' pri' : '') + '" data-act="ag-tugas" data-id="' + a.id + '">' + ic('person_add') + 'Tugaskan</button><button class="ico-btn" data-act="ag-menu" data-id="' + a.id + '" aria-label="Aksi">' + ic('more_vert') + '</button>' : '') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' : UI.empty('directions_car', st.lingkup === 'akan' ? 'Belum ada agenda mendatang' : 'Tidak ada data', admin && st.lingkup === 'akan' ? 'Tambahkan acara P3K atau piket Cuber dari surat permintaan.' : '', admin && st.lingkup === 'akan' ? '<button class="btn pri" data-act="ag-baru">' + ic('add') + 'Tambah Agenda</button>' : '');
      return '<div class="page-h"><div><h1>Agenda Luar Gedung</h1><p>Pos kesehatan (P3K) dan piket Cuti Bersama. Kategori Biasa/Libur ditentukan otomatis dari tanggal.</p></div><div class="row">' +
        UI.seg('ag-lingkup', [['akan', 'Akan datang'], ['lalu', 'Sudah lewat'], ['batal', 'Batal']], st.lingkup) + (admin ? '<button class="btn pri" data-act="ag-baru">' + ic('add') + 'Tambah Agenda</button>' : '') + '</div></div>' +
        '<section class="card">' + tabel + '</section>';
    }
  };
  DJ.on('ag-lingkup', (el) => { ui.agenda.lingkup = el.dataset.v; DJ.render(); });
  DJ.on('ag-menu', (el) => { const a = DJ.idx.agenda[el.dataset.id]; UI.menu(el, [{ ikon: 'edit', teks: 'Ubah', fn: () => formAgenda(a) }, { ikon: 'cancel', teks: 'Batalkan agenda', fn: () => batalAgenda(a) }]); });
  DJ.on('ag-baru', () => formAgenda(null));
  DJ.on('ag-tugas', (el) => tugaskan(DJ.idx.agenda[el.dataset.id]));
  async function batalAgenda(a) {
    if (!(await UI.konfirmasi({ judul: 'Batalkan agenda?', pesan: a.nama + ' akan dibatalkan; penugasan dokter ikut dibatalkan dan diberi tahu.', ok: 'Batalkan agenda', bahaya: true }))) return;
    try { await DJ.ubah(null, 'agenda.hapus', { id: a.id }, 'Agenda dibatalkan'); } catch (e) { }
  }
  function formAgenda(a) {
    const v = a || { t: '', jamMulai: '', jamSelesai: '', jenis: 'P3K', nama: '', lok: '', penyelenggara: '', surat: '', jumlah: 1 };
    const laci = UI.laci({
      judul: a ? 'Ubah Agenda' : 'Tambah Agenda', ikon: 'directions_car',
      isi: '<form class="form-grid" id="fAg" novalidate><div class="field full"><label>Nama acara <span class="req">*</span></label><input class="inp" name="nama" maxlength="160" required value="' + esc(v.nama) + '" placeholder="Mis. P3K Siaga POPDA Sepak Takraw"></div>' +
        '<div class="field"><label>Jenis</label><select class="inp" name="jenis">' + UI.opsi([['P3K', 'P3K (pos kesehatan)'], ['Cuber', 'Piket Cuti Bersama']], v.jenis) + '</select></div>' +
        '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="inp" type="date" name="tanggal" required value="' + esc(v.t) + '"><small data-kat></small></div>' +
        '<div class="field"><label>Jam mulai</label><input class="inp" type="time" name="jamMulai" value="' + esc(v.jamMulai) + '"></div><div class="field"><label>Jam selesai</label><input class="inp" type="time" name="jamSelesai" value="' + esc(v.jamSelesai) + '"></div>' +
        '<div class="field full"><label>Lokasi</label><input class="inp" name="lokasi" maxlength="160" value="' + esc(v.lok) + '"></div>' +
        '<div class="field"><label>Penyelenggara</label><input class="inp" name="penyelenggara" maxlength="160" value="' + esc(v.penyelenggara) + '"></div><div class="field"><label>Nomor surat</label><input class="inp" name="surat" maxlength="160" value="' + esc(v.surat) + '"></div>' +
        '<div class="field"><label>Jumlah dokter</label><input class="inp" type="number" min="1" max="10" name="jumlah" value="' + esc(v.jumlah) + '"></div>' +
        '<div class="field"><label>Surat permintaan (PDF/JPG, maks 5 MB)</label><input class="inp" type="file" name="berkas" accept="application/pdf,image/jpeg,image/png">' + (a && a.fileSurat ? '<small>Sudah ada berkas; unggah lagi untuk mengganti.</small>' : '') + '</div></form>',
      kaki: '<button class="btn" data-tutup>Batal</button><button class="btn pri" id="agSimpan">' + ic('save') + 'Simpan</button>'
    });
    const f = laci.el.querySelector('#fAg');
    const kat = () => { const t = f.tanggal.value, el = f.querySelector('[data-kat]'); if (!t) { el.textContent = ''; return; } el.textContent = f.jenis.value === 'Cuber' ? 'Kategori: Cuber' : 'Kategori otomatis: P3K ' + (DJ.hariLibur(t) || T.dow(t) === 7 ? 'Libur' : 'Biasa'); };
    f.addEventListener('input', kat); kat();
    laci.el.querySelector('#agSimpan').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      if (!f.nama.value.trim() || !f.tanggal.value) return UI.toast('Nama acara dan tanggal wajib diisi', 'warn');
      const p = { id: a ? a.id : '', nama: f.nama.value, jenis: f.jenis.value, tanggal: f.tanggal.value, jamMulai: f.jamMulai.value, jamSelesai: f.jamSelesai.value, lokasi: f.lokasi.value, penyelenggara: f.penyelenggara.value, surat: f.surat.value, jumlah: f.jumlah.value };
      const file = f.berkas.files[0];
      if (file) { if (file.size > 5 * 1024 * 1024) return UI.toast('Ukuran surat maksimal 5 MB', 'warn'); p.berkas = { nama: file.name, mime: file.type, data: await UI.bacaBerkas(file) }; }
      try {
        const r = await DJ.api('agenda.simpan', p, { timeout: 90000 });
        try { await DJ.segarkan(); } catch (x) { }
        laci.tutup(); DJ.render(); UI.toast('Agenda tersimpan');
        if (!a) tugaskan(DJ.idx.agenda[r.agenda.id] || r.agenda);
      } catch (x) { UI.galat(x); }
    }));
  }
  function tugaskan(a) {
    if (!a) return;
    const sudah = Object.values(DJ.idx.jadwal).filter((r) => r.ag === a.id && r.st !== 'Batal' && r.d).map((r) => r.d);
    const pilih = new Set(sudah);
    const laci = UI.laci({ judul: 'Tugaskan: ' + a.nama, ikon: 'person_add', isi: '<div class="callout">' + ic('event') + '<p><b>' + esc(T.fmtPanjang(a.t)) + '</b>' + (a.jamMulai ? ' · ' + esc(a.jamMulai + '–' + a.jamSelesai) : '') + (a.lok ? '<br>' + esc(a.lok) : '') + '<br>Butuh ' + a.jumlah + ' dokter.</p></div>' + UI.sk(4), kaki: '<button class="btn" data-tutup>Batal</button><button class="btn pri" id="tgSimpan">' + ic('check') + 'Simpan penugasan</button>' });
    const b = laci.el.querySelector('.drawer-b');
    let saran = [];
    const gambar = () => {
      b.innerHTML = '<div class="callout">' + ic('event') + '<p><b>' + esc(T.fmtPanjang(a.t)) + '</b>' + (a.lok ? ' · ' + esc(a.lok) : '') + '<br>Pilih ' + a.jumlah + ' dokter (' + pilih.size + ' dipilih).</p></div><div class="small muted">Saran diurutkan dari dokter dengan selisih terkecil (paling kurang) di kelompok ini:</div>' +
        saran.map((x) => '<button type="button" class="opt' + (pilih.has(x.id) ? ' on' : '') + (x.boleh ? '' : ' no') + '" data-u="' + x.id + '"' + (x.boleh || pilih.has(x.id) ? '' : ' disabled') + '>' + UI.av(x.id, 'sm') + '<div class="grow"><b>' + esc(x.nama) + '</b><div class="small muted">' + esc(x.kelompok + ' selisih ' + DJ.sel(x.selisih)) + (x.catatan.length ? ' · ' + esc(x.catatan.join('; ')) : '') + '</div></div>' + (pilih.has(x.id) ? ic('check_circle') : '') + '</button>').join('');
    };
    DJ.api('agenda.saran', { id: a.id }).then((d) => { saran = d.saran; gambar(); }).catch((e) => { UI.galat(e); b.innerHTML = UI.empty('error', 'Saran gagal dimuat'); });
    b.addEventListener('click', (e) => {
      const o = e.target.closest('[data-u]'); if (!o || o.disabled) return;
      const id = o.dataset.u;
      if (pilih.has(id)) pilih.delete(id); else { if (pilih.size >= a.jumlah) { if (a.jumlah === 1) pilih.clear(); else return UI.toast('Maksimal ' + a.jumlah + ' dokter', 'warn'); } pilih.add(id); }
      gambar();
    });
    laci.el.querySelector('#tgSimpan').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      const p = { id: a.id, dokter: Array.from(pilih) };
      try {
        let r = await DJ.api('agenda.tugaskan', p);
        if (r.perluKonfirmasi) { if (!(await UI.konfirmasi({ judul: 'Ada peringatan', htmlPesan: r.peringatan.map(esc).join('<br>') + '<br><br>Tetap tugaskan?', ok: 'Tetap tugaskan' }))) return; p.paksa = true; r = await DJ.api('agenda.tugaskan', p); }
        try { await DJ.segarkan(); } catch (x) { }
        laci.tutup(); DJ.render(); UI.toast('Penugasan tersimpan');
      } catch (x) { UI.galat(x); }
    }));
  }

  /* ======================================================================
   * BERHALANGAN
   * ==================================================================== */
  H.berhalangan = {
    render() {
      const me = DJ.uid(), pengelola = DJ.isPengelola(), hari = DJ.data.hariIni;
      const list = DJ.data.berhalangan.filter((b) => pengelola || b.d === me).sort((a, b) => (a.mulai < b.mulai ? 1 : -1));
      const bentrok = (b) => Object.values(DJ.idx.jadwal).filter((r) => r.d === b.d && r.t >= b.mulai && r.t <= b.selesai && r.st === 'Perlu Pengganti').length;
      return '<div class="page-h"><div><h1>Berhalangan</h1><p>Catat tanggal ketika tidak bisa bertugas agar tidak dijadwalkan. Jadwal yang sudah terbit akan dicarikan pengganti oleh Admin.</p></div></div>' +
        '<div class="grid g-7-5"><section class="card"><div class="card-h"><h2>Catat berhalangan</h2></div><form id="fBh" class="form-grid" novalidate>' +
        (pengelola ? '<div class="field full"><label>Dokter</label><select class="inp" name="idDokter">' + DJ.idx.dokter.map((u) => '<option value="' + u.id + '"' + (u.id === me ? ' selected' : '') + '>' + esc(u.nama) + '</option>').join('') + '</select></div>' : '') +
        '<div class="field"><label>Mulai <span class="req">*</span></label><input class="inp" type="date" name="mulai" required min="' + hari + '"></div><div class="field"><label>Selesai <span class="req">*</span></label><input class="inp" type="date" name="selesai" required min="' + hari + '"></div>' +
        '<div class="field"><label>Jenis</label><select class="inp" name="jenis">' + UI.opsi(['Cuti', 'Pelatihan', 'Dinas Luar', 'Sakit', 'Lainnya'], 'Cuti') + '</select></div>' +
        '<div class="field"><label>Keterangan</label><input class="inp" name="keterangan" maxlength="300" placeholder="Mis. Diklat ACLS"></div>' +
        '<div class="full" id="bhInfo"></div><div class="full row end"><button class="btn pri" type="submit" id="bhSimpan">' + ic('save') + 'Simpan</button></div></form></section>' +
        '<section class="card"><div class="card-h"><h2>' + (pengelola ? 'Semua catatan' : 'Catatan saya') + '</h2></div>' + (list.length ? '<div class="list">' + list.map((b) => {
          const n = bentrok(b), lewat = b.selesai < hari;
          return '<div class="li">' + UI.av(b.d, 'sm') + '<div class="grow"><b>' + esc(T.fmtPendek(b.mulai)) + (b.selesai !== b.mulai ? ' – ' + esc(T.fmtPendek(b.selesai)) : '') + '</b><div class="small muted">' + (pengelola ? esc(DJ.nama(b.d)) + ' · ' : '') + esc(b.jenis) + (b.ket ? ' · ' + esc(b.ket) : '') + '</div>' + (n ? UI.badge(n + ' perlu pengganti', 'b-red') : '') + '</div>' +
            (lewat ? UI.badge('Selesai', 'b-slate') : UI.statusBadge(b.status)) + (!lewat && (b.d === me || pengelola) ? '<button class="ico-btn" data-act="bh-batal" data-id="' + b.id + '" aria-label="Batalkan">' + ic('close') + '</button>' : '') + '</div>';
        }).join('') + '</div>' : UI.empty('event_available', 'Belum ada catatan berhalangan')) + '</section></div>';
    },
    setelah(k) {
      const f = k.querySelector('#fBh'); if (!f) return;
      const info = () => {
        const id = f.idDokter ? f.idDokter.value : DJ.uid(), a = f.mulai.value, b = f.selesai.value || a, box = k.querySelector('#bhInfo');
        if (!a) { box.innerHTML = ''; return; }
        const kena = Object.values(DJ.idx.jadwal).filter((r) => r.d === id && r.t >= a && r.t <= b && (r.st === 'Terbit' || r.st === 'Draf'));
        box.innerHTML = kena.length ? '<div class="callout warn">' + ic('warning') + '<p>Bentrok dengan ' + kena.length + ' jadwal: ' + kena.map((r) => esc(DJ.kodePendek(r.k) + ' ' + T.fmtPendek(r.t))).join(', ') + '. ' + (kena.some((r) => r.st === 'Terbit') ? 'Jadwal terbit akan ditandai <b>Perlu Pengganti</b> dan Admin diberi tahu.' : 'Jadwal draf akan dikosongkan.') + '</p></div>' : '<div class="callout">' + ic('check_circle') + '<p>Tidak ada jadwal yang bentrok.</p></div>';
      };
      f.addEventListener('input', info); f.addEventListener('change', info);
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!f.mulai.value || !f.selesai.value) return UI.toast('Isi tanggal mulai dan selesai', 'warn');
        if (f.selesai.value < f.mulai.value) return UI.toast('Tanggal selesai tidak boleh sebelum tanggal mulai', 'warn');
        try {
          const r = await DJ.ubah(k.querySelector('#bhSimpan'), 'berhalangan.simpan', { idDokter: f.idDokter ? f.idDokter.value : '', mulai: f.mulai.value, selesai: f.selesai.value, jenis: f.jenis.value, keterangan: f.keterangan.value });
          UI.toast(r.perluPengganti ? 'Tersimpan. ' + r.perluPengganti + ' jadwal ditandai perlu pengganti.' : r.dikosongkan ? 'Tersimpan. ' + r.dikosongkan + ' jadwal draf dikosongkan.' : 'Tersimpan');
        } catch (x) { }
      });
    }
  };
  DJ.on('bh-batal', async (el) => {
    if (!(await UI.konfirmasi({ judul: 'Batalkan catatan berhalangan?', pesan: 'Jadwal yang sudah dikosongkan atau ditandai perlu pengganti tidak dikembalikan otomatis.', ok: 'Batalkan catatan', bahaya: true }))) return;
    try { await DJ.ubah(el, 'berhalangan.batal', { id: el.dataset.id }, 'Catatan dibatalkan'); } catch (e) { }
  });
})(window.DJ);
