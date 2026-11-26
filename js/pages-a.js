/* pages-a.js — Beranda, Kalender Jadwal, Jadwal Saya, Tukar Jaga, detail jadwal. */
'use strict';
(function (DJ) {
  const UI = DJ.UI, T = DJ.T, esc = DJ.esc, ic = UI.ic;
  const H = DJ.halaman = DJ.halaman || {};
  const ui = DJ.ui;

  /* ======================================================================
   * DETAIL JADWAL (laci) — dipakai banyak halaman
   * ==================================================================== */
  DJ.detailJadwal = (id) => {
    const r = DJ.idx.jadwal[id] || (String(id).indexOf('lpt-') === 0 ? null : null);
    if (!r) { const asal = DJ.idx.jadwal[String(id).replace('lpt-', '')]; if (asal) UI.toast('Libur Pasca TGC Malam untuk ' + DJ.nama(asal.d), 'info'); return; }
    const k = DJ.idx.keg[r.k] || {}, ag = r.ag ? DJ.idx.agenda[r.ag] : null, me = DJ.uid();
    const bisaTukar = r.d === me && r.st === 'Terbit' && T.diff(DJ.data.hariIni, r.t) >= (+DJ.set('Batas_Ajukan_Tukar_Hari') || 2) && DJ.statusPeriode(r.t.slice(0, 7)) !== 'Dikunci';
    const baris = (l, v) => '<div class="li"><span class="muted" style="width:130px;flex-shrink:0">' + esc(l) + '</span><span class="grow"><b>' + v + '</b></span></div>';
    const isi = '<div class="row">' + UI.chip(r.k, { teks: DJ.namaKeg(r.k), cls: 'solid' }) + UI.statusBadge(r.st) + (r.cek ? UI.badge('Perlu dicek', 'b-amber') : '') + '</div>' +
      '<div class="list">' + baris('Tanggal', esc(T.fmtPanjang(r.t)) + (DJ.hariLibur(r.t) ? ' · <span style="color:#B42318">' + esc(DJ.hariLibur(r.t).ket) + '</span>' : '')) +
      baris('Jam', esc(DJ.jam(r.k) || 'Belum diatur')) + baris('Dokter', r.d ? UI.who(r.d, esc((DJ.idx.user[r.d] || {}).status || '')) : '<span style="color:#B42318">Belum terisi</span>') +
      baris('Kelompok', esc(k.kelompok || '-') + (r.tag ? ' · ' + esc(DJ.labelKel(r.tag)) : '')) +
      (ag ? baris('Agenda', esc(ag.nama) + (ag.lok ? '<br><small class="muted">' + esc(ag.lok) + '</small>' : '')) : r.lok ? baris('Lokasi', esc(r.lok)) : '') +
      baris('Sumber', esc(r.src || '-')) + '</div>' +
      (r.al ? '<div class="callout">' + ic('info') + '<p><b>Alasan penugasan</b><br>' + esc(r.al) + '</p></div>' : '');
    const kaki = '<button class="btn" data-act="ics-satu" data-id="' + esc(r.id) + '">' + ic('event') + 'Tambah ke kalender</button>' +
      (DJ.isAdmin() ? '<button class="btn" data-act="ke-kelola" data-t="' + r.t + '">' + ic('edit_calendar') + 'Ubah</button>' : '') +
      (bisaTukar ? '<button class="btn pri" data-act="tukar-baru" data-id="' + esc(r.id) + '">' + ic('swap_horiz') + 'Ajukan tukar</button>' : '');
    UI.laci({ judul: DJ.namaKeg(r.k), ikon: r.k.indexOf('TGC') === 0 ? 'emergency' : r.k.indexOf('P3K') === 0 || r.k === 'CUBER' ? 'directions_car' : 'local_hospital', isi, kaki });
  };
  DJ.on('detail', (el) => DJ.detailJadwal(el.dataset.id));
  DJ.on('ics-satu', (el) => { const r = DJ.idx.jadwal[el.dataset.id]; DJ.unduh('jaga-' + r.t + '.ics', DJ.ics([r]), 'text/calendar'); });
  DJ.on('ke-kelola', (el) => { UI.tutupSemua(); ui.kelola = Object.assign(ui.kelola || {}, { per: el.dataset.t.slice(0, 7), bukaTgl: el.dataset.t }); DJ.ke('kelola'); });

  /* ======================================================================
   * BERANDA
   * ==================================================================== */
  ui.beranda = { tgl: null, mode: 'papan', kel: 'SJ', lingkup: 'kum', dok: '' };
  const pill = (sel) => { const r = Math.round(sel * 10) / 10; if (Math.abs(r) <= 0.5) return UI.badge('Sesuai target', 'b-green'); return r > 0 ? UI.badge(DJ.sel(r) + ' di atas target', 'b-amber') : UI.badge(DJ.sel(r) + ' dari target', 'b-amber'); };

  function kpiDokter() {
    const me = DJ.uid(), per = DJ.data.hariIni.slice(0, 7), hari = DJ.data.hariIni;
    const rows = (DJ.jadwalBulan(per) || []).filter((r) => r.d === me && (r.st === 'Terbit' || r.st === 'Draf'));
    const rek = (DJ.data.beban.bulanIni.dokter || []).find((x) => x.id === me) || { real: {}, target: {} };
    const sore = rows.filter((r) => r.k === 'SB' || r.k === 'SJ').length, tSore = (rek.target.SB || 0) + (rek.target.SJ || 0);
    const tgc = rows.filter((r) => r.k.indexOf('TGC') === 0).length, tTgc = (rek.target['TGC-P'] || 0) + (rek.target['TGC-S'] || 0) + (rek.target['TGC-M'] || 0);
    const luar = rows.filter((r) => (r.k.indexOf('P3K') === 0 || r.k === 'CUBER') && r.t >= hari).length;
    const tugasTukar = DJ.tugasTukarSaya().length, milik = DJ.data.tukar.filter((t) => t.pemohon === me && t.status.indexOf('Menunggu') === 0).length;
    return [
      ['calendar_today', sore, 'Piket Sore bulan ini', pill(sore - tSore), 'jadwal-saya'],
      ['emergency', tgc, 'TGC bulan ini', pill(tgc - tTgc), 'jadwal-saya'],
      ['directions_car', luar, 'Agenda luar gedung', luar ? UI.badge('Terjadwal', 'b-green') : UI.badge('Belum ada', 'b-slate'), 'agenda'],
      ['swap_horiz', tugasTukar + milik, 'Tukar menunggu', tugasTukar ? UI.badge('Perlu tindakan Anda', 'b-amber') : milik ? UI.badge('Menunggu rekan', 'b-amber') : UI.badge('Tidak ada', 'b-slate'), 'tukar']
    ];
  }
  function rentangBeban() {
    const tetap = DJ.data.beban.dokter.filter((d) => d.status === 'Tetap');
    let terbesar = { g: '', v: 0 };
    DJ.data.beban.kelompok.forEach((g) => {
      const s = tetap.map((d) => (d.real[g] || 0) - (d.target[g] || 0));
      if (!s.length) return;
      const v = Math.max(...s) - Math.min(...s);
      if (v > terbesar.v) terbesar = { g, v };
    });
    return terbesar;
  }
  function kpiPengelola() {
    const hari = DJ.data.hariIni, kosong = DJ.perluPengganti().filter((r) => r.t >= hari).length;
    const rb = rentangBeban(), menunggu = DJ.data.tukar.filter((t) => t.status === 'Menunggu Persetujuan').length;
    const minggu = DJ.data.agenda.filter((a) => a.status !== 'Batal' && a.t >= hari && a.t <= T.add(hari, 7)).length;
    return [
      ['assignment_turned_in', kosong, 'Slot belum terisi', kosong ? UI.badge('Perlu pengganti', 'b-red') : UI.badge('Lengkap', 'b-green'), 'kelola'],
      ['balance', DJ.num(rb.v), 'Selisih terbesar' + (rb.g ? ': ' + DJ.labelKel(rb.g) : ''), rb.v > 1 ? UI.badge('Perlu diratakan', 'b-amber') : UI.badge('Merata', 'b-green'), 'beban'],
      ['pending_actions', menunggu, 'Tukar menunggu persetujuan', menunggu ? UI.badge(DJ.penyetujuSaya() ? 'Perlu tindakan Anda' : 'Menunggu', 'b-amber') : UI.badge('Tidak ada', 'b-slate'), 'tukar'],
      ['event', minggu, 'Agenda 7 hari ke depan', UI.badge('P3K & Cuber', 'b-mint'), 'agenda']
    ];
  }
  function berikutTgc(dari) { for (let i = 1; i <= 12; i++) { const t = T.add(dari, i), s = DJ.sesiTgc(t); if (s) return T.fmtPendek(t) + ' (' + DJ.namaKeg('TGC-' + s).replace('TGC ', '') + ')'; } return ''; }
  function tile(r) {
    return '<div class="tile click" data-act="detail" data-id="' + esc(r.id) + '" role="button" tabindex="0">' + UI.av(r.d) + '<div class="who"><div><b>' + esc(DJ.nama(r.d)) + ' <span class="dot-c" style="--c:' + DJ.warna(r.k) + '"></span></b><small>' + esc(DJ.namaKeg(r.k)) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '') + (r.lok ? ' · ' + esc(r.lok) : '') + '</small></div></div>' + ic('chevron_right', 'muted') + '</div>';
  }
  function papan(t) {
    const st = ui.beranda;
    let rows = DJ.tugasPada(t).filter((r) => r.k !== 'LPT' && r.st !== 'Batal' && (!st.dok || r.d === st.dok)).sort(DJ.urutKeg);
    const kosongRow = rows.filter((r) => !r.d);
    rows = rows.filter((r) => r.d);
    if (st.mode === 'daftar') {
      return rows.length || kosongRow.length ? '<div class="list">' + rows.map((r) => '<div class="li click" data-act="detail" data-id="' + esc(r.id) + '">' + UI.chip(r.k) + UI.who(r.d, esc(DJ.namaKeg(r.k)) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '')) + '<span class="grow"></span>' + UI.statusBadge(r.st) + '</div>').join('') +
        kosongRow.map((r) => '<div class="li">' + UI.chip(r.k) + '<b style="color:#B42318">Belum terisi</b></div>').join('') + '</div>' : UI.empty('event_available', 'Tidak ada tugas jaga', 'Belum ada jadwal pada tanggal ini.');
    }
    const kol = [
      ['c-dg', 'Dalam Gedung', rows.filter((r) => DJ.kelompokKeg(r.k) === 'Dalam Gedung'), 'local_hospital', DJ.hariLibur(t) ? 'Hari libur — tidak ada piket sore' : T.dow(t) >= 6 ? 'Akhir pekan — tidak ada piket sore' : 'Tidak ada piket hari ini'],
      ['c-tgc', 'TGC', rows.filter((r) => r.k.indexOf('TGC') === 0), 'emergency', 'Tidak ada TGC hari ini · Berikutnya ' + berikutTgc(t)],
      ['c-lg', 'Luar Gedung', rows.filter((r) => DJ.kelompokKeg(r.k) === 'Luar Gedung' && r.k.indexOf('TGC') !== 0), 'directions_car', 'Tidak ada agenda luar gedung hari ini']
    ];
    return '<div class="board">' + kol.map((c) => '<div class="col"><div class="col-h ' + c[0] + '"><span class="row" style="gap:8px"><span class="dot-c" style="--c:' + (c[0] === 'c-dg' ? '#2E9E5B' : c[0] === 'c-tgc' ? '#EA7A1A' : '#D9544D') + '"></span>' + c[1] + '</span><span class="n">' + c[2].length + '</span></div>' +
      (c[2].length ? c[2].map(tile).join('') : '<div class="col-empty">' + ic(c[3], 'muted') + '<span>' + esc(c[4]) + '</span></div>') + '</div>').join('') + '</div>' +
      (kosongRow.length ? '<div class="callout bad" style="margin-top:12px">' + ic('warning') + '<p>' + kosongRow.length + ' slot belum terisi pada tanggal ini.' + (DJ.isAdmin() ? ' <a href="#/kelola" data-act="ke-kelola" data-t="' + t + '">Isi sekarang</a>' : '') + '</p></div>' : '');
  }
  function grafikBeban() {
    const st = ui.beranda, g = st.kel;
    let data;
    if (st.lingkup === 'bulan') data = (DJ.data.beban.bulanIni.dokter || []).filter((d) => d.status === 'Tetap').map((d) => ({ id: d.id, real: d.real[g] || 0, target: d.target[g] || 0 }));
    else data = DJ.data.beban.dokter.filter((d) => d.status === 'Tetap').map((d) => ({ id: d.id, real: d.real[g] || 0, target: d.target[g] || 0 }));
    if (!data.length) return UI.empty('bar_chart', 'Belum ada data beban');
    const rata = data.reduce((a, x) => a + x.target, 0) / data.length;
    return UI.grafikBatang(data.map((x) => { const s = x.real - x.target; return { label: DJ.nama(x.id), nilai: x.real, target: x.target, status: Math.abs(s) <= 0.5 ? 'ok' : s > 0 ? 'up' : 'down' }; }), { target: rata, judul: 'Pemerataan ' + DJ.labelKel(g) });
  }
  function daftarTukar() {
    const me = DJ.uid(), list = DJ.data.tukar.slice().sort((a, b) => ((a.status.indexOf('Menunggu') === 0 ? 0 : 1) - (b.status.indexOf('Menunggu') === 0 ? 0 : 1)) || (a.tgl < b.tgl ? 1 : -1))
      .filter((t) => DJ.isPengelola() || t.pemohon === me || t.rekan === me).slice(0, 5);
    if (!list.length) return UI.empty('swap_horiz', 'Belum ada permintaan tukar');
    return '<div class="list">' + list.map((t) => {
      const asal = DJ.idx.jadwal[t.asal];
      return '<div class="li click" data-act="ke" data-ke="tukar">' + UI.av(t.pemohon, 'sm') + '<div class="grow"><b>' + esc(DJ.nama(t.pemohon)) + ' → ' + esc(DJ.nama(t.rekan)) + '</b><div class="small muted">' + (asal ? esc(DJ.namaKeg(asal.k) + ' · ' + T.fmtPendek(asal.t)) : '') + '</div></div><div style="text-align:right"><div class="small muted">' + esc(T.rel(t.tgl)) + '</div>' + UI.statusBadge(t.status) + '</div></div>';
    }).join('') + '</div>';
  }
  function statusDokter(t) {
    const list = DJ.idx.dokter.filter((u) => DJ.aktifPada(u, t) && (!ui.beranda.dok || u.id === ui.beranda.dok));
    return '<div class="grid g4">' + list.map((u) => {
      const s = DJ.statusDokter(u, t), nx = DJ.tugasBerikut(u.id, t);
      return '<div class="card" style="background:#F6F9F7;box-shadow:none;padding:16px"><div class="who">' + UI.av(u, s.cls === 'b-green' || s.cls === 'b-orange' ? 'solid' : '') + '<div><b>' + esc(u.nama) + '</b>' + UI.badge(s.teks, s.cls) + '</div></div>' +
        '<div class="small muted" style="margin-top:12px">' + (s.row ? 'Sedang bertugas' + (DJ.jam(s.row.k) ? ' · ' + DJ.jam(s.row.k) : '') : nx ? 'Berikutnya: ' + esc(T.fmtPendek(nx.t) + ' · ' + DJ.namaKeg(nx.k)) : 'Belum ada jadwal berikutnya') + '</div></div>';
    }).join('') + '</div>';
  }

  H.beranda = {
    render() {
      const st = ui.beranda, u = DJ.sesi.user, hari = DJ.data.hariIni;
      if (!st.tgl) st.tgl = hari;
      if (!DJ.data.beban.kelompok.includes(st.kel)) st.kel = DJ.data.beban.kelompok[0];
      const pengelola = DJ.isPengelola(), kpi = pengelola ? kpiPengelola() : kpiDokter();
      const sub = pengelola ? 'Pantau kesiapan jaga dokter dan kelola jadwal ' + esc(DJ.set('Nama_Puskesmas')) + '.' : 'Pantau jadwal jaga, tukar jaga, dan pemerataan beban ' + esc(DJ.set('Nama_Puskesmas')) + '.';
      const tombol = DJ.isAdmin() ? '<a class="btn pri" href="#/kelola">' + ic('auto_awesome') + 'Susun Jadwal</a>' : DJ.isDokter() ? '<button class="btn pri" data-act="tukar-baru">' + ic('add') + 'Ajukan Tukar</button>' : '';
      const pp = DJ.isAdmin() ? DJ.perluPengganti().filter((r) => r.t >= hari) : [];
      return '<div class="page-h"><div><h1>' + esc(T.salam()) + ', ' + esc(u.nama) + '</h1><p>' + sub + '</p></div></div>' +
        (pp.length ? '<div class="callout bad" style="margin-bottom:20px">' + ic('person_alert') + '<p><b>' + pp.length + ' jadwal perlu pengganti.</b> ' + pp.slice(0, 3).map((r) => esc(DJ.namaKeg(r.k) + ' ' + T.fmtPendek(r.t))).join(', ') + (pp.length > 3 ? ', …' : '') + ' <a href="#/kelola" data-act="ke-kelola" data-t="' + pp[0].t + '">Atur di Kelola Jadwal</a></p></div>' : '') +
        '<div class="grid g4">' + kpi.map((k) => '<div class="card kpi click" data-act="ke" data-ke="' + k[4] + '" role="button" tabindex="0"><span class="ic">' + ic(k[0]) + '</span><div style="min-width:0"><div class="v tnum">' + k[1] + '</div><div class="l">' + esc(k[2]) + '</div>' + k[3] + '</div></div>').join('') + '</div>' +
        '<div class="row sb" style="margin:20px 0"><div class="row">' + UI.pillSel('ber-dok', 'group', [['', 'Semua dokter']].concat(DJ.idx.dokter.map((d) => [d.id, d.nama])), st.dok, 'Filter dokter') + '</div>' +
        '<div class="row"><div class="datenav"><button class="ico-btn" data-act="ber-tgl" data-n="-1" aria-label="Hari sebelumnya">' + ic('chevron_left') + '</button><b>' + (st.tgl === hari ? 'Hari ini, ' : '') + esc(T.fmt(st.tgl)) + '</b><button class="ico-btn" data-act="ber-tgl" data-n="1" aria-label="Hari berikutnya">' + ic('chevron_right') + '</button></div>' + tombol + '</div></div>' +
        '<div class="stack"><section class="card"><div class="card-h"><h2>Papan Jaga ' + (st.tgl === hari ? 'Hari Ini' : T.fmtPendek(st.tgl)) + '</h2>' + UI.seg('ber-mode', [['papan', 'Papan', 'view_kanban'], ['daftar', 'Daftar', 'format_list_bulleted']], st.mode) + '</div>' + papan(st.tgl) + '</section>' +
        '<div class="grid g-7-5"><section class="card"><div class="card-h"><div><h2>Pemerataan Beban</h2><p>' + (st.lingkup === 'bulan' ? 'Bulan ini' : 'Kumulatif ' + esc(T.fmtPer(DJ.data.beban.dari)) + ' – sekarang') + ' · dokter tetap</p></div><div class="row">' +
        UI.pillSel('ber-kel', 'filter_list', DJ.data.beban.kelompok.map((g) => [g, DJ.labelKel(g)]), st.kel, 'Kelompok') + UI.seg('ber-lingkup', [['kum', 'Kumulatif'], ['bulan', 'Bulan ini']], st.lingkup) + '</div></div>' + grafikBeban() +
        '<div class="legend" style="margin-top:8px"><span><i style="background:#1E7A4F"></i>Sesuai target (±0,5)</span><span><i style="background:#FEF3C7;border:2px solid #F59E0B"></i>Di atas target</span><span><i style="background:#FEE2E2;border:2px solid #DC4C4C"></i>Di bawah target</span></div></section>' +
        '<section class="card"><div class="card-h"><h2>Permintaan Tukar Jaga</h2><a href="#/tukar" class="small" style="font-weight:600">Lihat semua →</a></div>' + daftarTukar() + '</section></div>' +
        '<section class="card"><div class="card-h"><h2>Status Dokter ' + (st.tgl === hari ? 'Hari Ini' : T.fmtPendek(st.tgl)) + '</h2></div>' + statusDokter(st.tgl) + '</section></div>';
    }
  };
  DJ.on('ke', (el) => DJ.ke(el.dataset.ke));
  DJ.on('ber-tgl', (el) => { ui.beranda.tgl = T.add(ui.beranda.tgl, +el.dataset.n); const per = ui.beranda.tgl.slice(0, 7); if (DJ.jadwalBulan(per) === null) DJ.muatBulan(per).then(DJ.render).catch(UI.galat); DJ.render(); });
  DJ.on('ber-mode', (el) => { ui.beranda.mode = el.dataset.v; DJ.render(); });
  DJ.on('ber-kel', (el) => { ui.beranda.kel = el.value; DJ.render(); });
  DJ.on('ber-lingkup', (el) => { ui.beranda.lingkup = el.dataset.v; DJ.render(); });
  DJ.on('ber-dok', (el) => { ui.beranda.dok = el.value; DJ.render(); });

  /* ======================================================================
   * KALENDER JADWAL
   * ==================================================================== */
  ui.kal = { per: null, mode: 'bulan', dok: '', keg: '', kel: '', minggu: null };
  const GRUP_KEG = [['', 'Semua kegiatan'], ['SORE', 'Piket sore'], ['TGC', 'TGC'], ['P3K', 'P3K'], ['CUBER', 'Cuber']];
  function cocokFilter(r) {
    const st = ui.kal;
    if (st.dok && r.d !== st.dok) return false;
    if (st.keg === 'SORE' && !(r.k === 'SB' || r.k === 'SJ')) return false;
    if (st.keg === 'TGC' && !(r.k.indexOf('TGC') === 0 || r.k === 'LPT')) return false;
    if (st.keg === 'P3K' && r.k.indexOf('P3K') !== 0) return false;
    if (st.keg === 'CUBER' && r.k !== 'CUBER') return false;
    if (st.kel && r.k !== 'LPT' && DJ.kelompokKeg(r.k) !== st.kel && !(st.kel === 'Luar Gedung' && r.k.indexOf('TGC') === 0)) return false;
    return r.st !== 'Batal';
  }
  function chipJadwal(r) {
    const u = DJ.idx.user[r.d];
    const teks = (r.k === 'LPT' ? 'LPT' : DJ.kodePendek(r.k)) + ' · ' + (u ? u.singkat : 'Kosong');
    return UI.chip(r.k, { teks, act: 'detail', id: r.id, cls: !r.d ? 'empty' : r.st === 'Perlu Pengganti' ? 'need' : '', title: DJ.namaKeg(r.k) + ' — ' + (u ? u.nama : 'belum terisi') });
  }
  function hariDiGrid(per) {
    const awal = per + '-01', akhir = per + '-' + String(T.daysIn(per)).padStart(2, '0');
    const mulai = T.add(awal, 1 - T.dow(awal)), selesai = T.add(akhir, 7 - T.dow(akhir)), out = [];
    for (let t = mulai; t <= selesai; t = T.add(t, 1)) out.push(t);
    return out;
  }
  function gridBulan(per, rows) {
    const hari = DJ.data.hariIni, perTgl = {};
    rows.forEach((r) => { (perTgl[r.t] = perTgl[r.t] || []).push(r); });
    return '<div class="cal">' + T.HARI3.map((h) => '<div class="dh">' + h + '</div>').join('') + hariDiGrid(per).map((t) => {
      const di = t.slice(0, 7) === per, L = DJ.hariLibur(t), list = (perTgl[t] || []).filter(cocokFilter).sort(DJ.urutKeg);
      const cls = 'dc' + (di ? '' : ' out') + (L ? ' hol' : T.dow(t) >= 6 ? ' we' : '') + (t === hari ? ' today' : '');
      return '<div class="' + cls + '"><div class="dn"><span>' + (+t.slice(8)) + '</span>' + (di && list.length > 4 ? '<span class="more" data-act="kal-hari" data-t="' + t + '">+' + (list.length - 3) + '</span>' : '') + '</div>' +
        (L && di ? '<div class="hn" title="' + esc(L.ket) + '">' + esc(L.ket) + '</div>' : '') + (di ? (list.length > 4 ? list.slice(0, 3) : list).map(chipJadwal).join('') : '') + '</div>';
    }).join('') + '</div>';
  }
  function gridMinggu(rows) {
    const st = ui.kal, hari = DJ.data.hariIni;
    const perTgl = {}; rows.forEach((r) => { (perTgl[r.t] = perTgl[r.t] || []).push(r); });
    return '<div class="week">' + Array.from({ length: 7 }, (_, i) => T.add(st.minggu, i)).map((t) => {
      const L = DJ.hariLibur(t), list = (perTgl[t] || []).filter(cocokFilter).sort(DJ.urutKeg);
      return '<div class="wd' + (L ? ' hol' : '') + (t === hari ? ' today' : '') + '"><h4>' + T.HARI[T.dow(t) - 1] + '<small>' + esc(T.fmtPendek(t).split(' ').slice(1).join(' ')) + (L ? ' · ' + esc(L.ket) : '') + '</small></h4>' +
        (list.length ? list.map((r) => '<div class="ev" style="--c:' + DJ.warna(r.k) + '" data-act="detail" data-id="' + esc(r.id) + '" role="button" tabindex="0"><b>' + esc(DJ.namaKeg(r.k)) + '</b><span>' + esc(r.d ? DJ.nama(r.d) : 'Belum terisi') + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '') + '</span></div>').join('') : '<span class="small muted">Tidak ada jadwal</span>') + '</div>';
    }).join('') + '</div>';
  }
  function daftarBulan(per, rows) {
    const perTgl = {}; rows.filter(cocokFilter).forEach((r) => { (perTgl[r.t] = perTgl[r.t] || []).push(r); });
    const tgl = Object.keys(perTgl).sort();
    if (!tgl.length) return UI.empty('event_busy', 'Tidak ada jadwal', 'Ubah filter atau pilih bulan lain.');
    return '<div class="list">' + tgl.map((t) => '<div class="li" style="align-items:flex-start"><div class="datebox' + (DJ.hariLibur(t) ? ' libur' : '') + '"><b>' + (+t.slice(8)) + '</b><small>' + T.HARI3[T.dow(t) - 1] + '</small></div><div class="grow" style="display:grid;gap:6px">' +
      perTgl[t].sort(DJ.urutKeg).map((r) => '<div class="row" data-act="detail" data-id="' + esc(r.id) + '" role="button" tabindex="0" style="cursor:pointer">' + UI.chip(r.k) + '<span><b>' + esc(r.d ? DJ.nama(r.d) : 'Belum terisi') + '</b> <span class="muted small">' + esc(DJ.namaKeg(r.k)) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '') + (r.lok ? ' · ' + esc(r.lok) : '') + '</span></span></div>').join('') + '</div></div>').join('') + '</div>';
  }
  function legenda() {
    return '<div class="legend" style="margin-top:14px"><b style="color:var(--teks)">Keterangan:</b>' + DJ.data.kegiatan.filter((k) => k.aktif).sort((a, b) => a.urut - b.urut)
      .filter((k) => k.kode !== 'P3K-L').map((k) => '<span>' + UI.chip(k.kode) + esc(k.kode === 'P3K-B' ? 'P3K' : k.nama) + '</span>').join('') + '</div>';
  }
  H.kalender = {
    render() {
      const st = ui.kal, hari = DJ.data.hariIni;
      if (!st.per) st.per = hari.slice(0, 7);
      if (!st.minggu) st.minggu = T.add(hari, 1 - T.dow(hari));
      const per = st.mode === 'minggu' ? st.minggu.slice(0, 7) : st.per;
      let rows = DJ.jadwalBulan(per);
      const perAkhir = st.mode === 'minggu' ? T.add(st.minggu, 6).slice(0, 7) : per;
      if (rows === null || (perAkhir !== per && DJ.jadwalBulan(perAkhir) === null)) {
        Promise.all([per, perAkhir].filter((p, i, a) => a.indexOf(p) === i && DJ.jadwalBulan(p) === null).map(DJ.muatBulan)).then(DJ.render).catch(UI.galat);
        rows = null;
      }
      const prevPer = T.shift(per, -1), sebelum = DJ.jadwalBulan(prevPer) || [];
      let semua = rows ? DJ.denganLpt(rows.concat(sebelum.filter((r) => r.k === 'TGC-M' && r.t === T.add(per + '-01', -1)))) : [];
      if (st.mode === 'minggu' && rows && perAkhir !== per) semua = DJ.denganLpt(rows.concat(DJ.jadwalBulan(perAkhir) || []));
      const judul = st.mode === 'minggu' ? T.fmtPendek(st.minggu) + ' – ' + T.fmtPendek(T.add(st.minggu, 6)) + ' ' + T.add(st.minggu, 6).slice(0, 4) : T.fmtPer(st.per);
      const status = DJ.statusPeriode(per);
      return '<div class="page-h"><div><div class="eyebrow">Kalender Jadwal</div><h1>' + esc(judul) + ' ' + UI.statusBadge(status) + '</h1></div>' +
        '<div class="row"><div class="datenav"><button class="ico-btn" data-act="kal-geser" data-n="-1" aria-label="Sebelumnya">' + ic('chevron_left') + '</button><button class="btn ghost sm" data-act="kal-hariini">Hari ini</button><button class="ico-btn" data-act="kal-geser" data-n="1" aria-label="Berikutnya">' + ic('chevron_right') + '</button></div>' +
        UI.seg('kal-mode', [['bulan', 'Bulan', 'calendar_view_month'], ['minggu', 'Minggu', 'view_week'], ['daftar', 'Daftar', 'format_list_bulleted']], st.mode) + '</div></div>' +
        '<div class="row" style="margin-bottom:16px">' + UI.pillSel('kal-dok', 'person', [['', 'Semua dokter']].concat(DJ.idx.dokter.map((d) => [d.id, d.nama])), st.dok, 'Dokter') +
        UI.pillSel('kal-keg', 'category', GRUP_KEG, st.keg, 'Kegiatan') + UI.pillSel('kal-kel', 'apartment', [['', 'Dalam & luar gedung'], ['Dalam Gedung', 'Dalam gedung'], ['Luar Gedung', 'Luar gedung']], st.kel, 'Kelompok') +
        (DJ.isDokter() ? '<button class="btn sm" data-act="kal-saya">' + ic('person_pin') + 'Jadwal saya</button>' : '') + '</div>' +
        '<section class="card" style="padding:' + (st.mode === 'bulan' ? '12px' : '20px') + '">' + (!rows ? UI.sk(8) : st.mode === 'bulan' ? gridBulan(per, semua) : st.mode === 'minggu' ? gridMinggu(semua) : daftarBulan(per, semua)) + legenda() + '</section>';
    }
  };
  DJ.on('kal-geser', (el) => { const st = ui.kal, n = +el.dataset.n; if (st.mode === 'minggu') st.minggu = T.add(st.minggu, 7 * n); else st.per = T.shift(st.per, n); DJ.render(); });
  DJ.on('kal-hariini', () => { const h = DJ.data.hariIni; ui.kal.per = h.slice(0, 7); ui.kal.minggu = T.add(h, 1 - T.dow(h)); DJ.render(); });
  DJ.on('kal-mode', (el) => { const st = ui.kal; st.mode = el.dataset.v; if (st.mode === 'minggu' && st.minggu.slice(0, 7) !== st.per) st.minggu = T.add(st.per + '-01', 1 - T.dow(st.per + '-01')); DJ.render(); });
  DJ.on('kal-dok', (el) => { ui.kal.dok = el.value; DJ.render(); });
  DJ.on('kal-keg', (el) => { ui.kal.keg = el.value; DJ.render(); });
  DJ.on('kal-kel', (el) => { ui.kal.kel = el.value; DJ.render(); });
  DJ.on('kal-saya', () => { ui.kal.dok = ui.kal.dok === DJ.uid() ? '' : DJ.uid(); DJ.render(); });
  DJ.on('kal-hari', (el) => {
    const t = el.dataset.t, list = DJ.tugasPada(t).filter(cocokFilter).sort(DJ.urutKeg);
    UI.laci({ judul: T.fmtPanjang(t), ikon: 'event', isi: '<div class="list">' + list.map((r) => '<div class="li click" data-act="detail" data-id="' + esc(r.id) + '">' + UI.chip(r.k) + '<div class="grow"><b>' + esc(r.d ? DJ.nama(r.d) : 'Belum terisi') + '</b><div class="small muted">' + esc(DJ.namaKeg(r.k)) + '</div></div>' + ic('chevron_right', 'muted') + '</div>').join('') + '</div>' });
  });

  /* ======================================================================
   * JADWAL SAYA
   * ==================================================================== */
  ui.saya = { tab: 'akan', riwayat: null, halaman: 1, total: 0 };
  function labelMinggu(senin, hari) {
    const ini = T.add(hari, 1 - T.dow(hari));
    if (senin === ini) return 'Minggu ini'; if (senin === T.add(ini, 7)) return 'Minggu depan';
    return T.fmtPendek(senin).replace(/^\w+ /, '') + ' – ' + T.fmtPendek(T.add(senin, 6)).replace(/^\w+ /, '');
  }
  function barisSaya(r, bisaAksi) {
    const L = DJ.hariLibur(r.t);
    return '<div class="li"><div class="datebox' + (L ? ' libur' : '') + '"><b>' + (+r.t.slice(8)) + '</b><small>' + T.HARI3[T.dow(r.t) - 1] + '</small></div>' + UI.chip(r.k) +
      '<div class="grow"><b>' + esc(DJ.namaKeg(r.k)) + '</b><div class="small muted">' + esc(T.BULAN3[+r.t.slice(5, 7) - 1] + ' ' + r.t.slice(0, 4)) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '') + (r.lok ? ' · ' + esc(r.lok) : '') + (L ? ' · ' + esc(L.ket) : '') + '</div></div>' +
      UI.statusBadge(r.src === 'Tukar' && r.st === 'Terbit' ? 'Ditukar' : r.st) +
      (bisaAksi ? '<button class="ico-btn" data-act="saya-menu" data-id="' + esc(r.id) + '" aria-label="Aksi">' + ic('more_vert') + '</button>' : '') + '</div>';
  }
  H['jadwal-saya'] = {
    render() {
      const st = ui.saya, me = DJ.uid(), hari = DJ.data.hariIni, per = hari.slice(0, 7);
      const akan = Object.values(DJ.idx.jadwal).filter((r) => r.d === me && r.t >= hari && r.st !== 'Batal').sort((a, b) => (a.t < b.t ? -1 : 1));
      const bulanIni = (DJ.jadwalBulan(per) || []).filter((r) => r.d === me && r.st !== 'Batal');
      const hit = (f) => bulanIni.filter(f).length;
      let isi;
      if (st.tab === 'akan') {
        if (!akan.length) isi = UI.empty('event_available', 'Belum ada jadwal mendatang', 'Jadwal akan muncul setelah Admin menerbitkannya.');
        else {
          const grup = {};
          akan.forEach((r) => { const s = T.add(r.t, 1 - T.dow(r.t)); (grup[s] = grup[s] || []).push(r); });
          isi = Object.keys(grup).sort().map((s) => '<h3 class="small muted" style="margin:18px 0 4px;text-transform:uppercase;letter-spacing:.06em">' + esc(labelMinggu(s, hari)) + '</h3><div class="list">' + grup[s].map((r) => barisSaya(r, true)).join('') + '</div>').join('');
        }
      } else {
        if (st.riwayat === null) { DJ.api('jadwal.riwayatSaya', { halaman: 1 }).then((d) => { st.riwayat = d.baris; st.total = d.total; st.halaman = 1; DJ.render(); }).catch(UI.galat); isi = UI.sk(6); }
        else isi = st.riwayat.length ? '<div class="list">' + st.riwayat.map((r) => barisSaya(r, false)).join('') + '</div>' + (st.riwayat.length < st.total ? '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-act="saya-lagi">Muat lagi</button></div>' : '') : UI.empty('history', 'Belum ada riwayat');
      }
      return '<div class="page-h"><div><h1>Jadwal Saya</h1><p>Tugas jaga Anda yang akan datang dan riwayatnya.</p></div><div class="row">' +
        (akan.length ? '<button class="btn" data-act="saya-ics">' + ic('event') + 'Tambah semua ke kalender</button>' : '') + '<button class="btn pri" data-act="tukar-baru">' + ic('swap_horiz') + 'Ajukan Tukar</button></div></div>' +
        '<div class="card" style="margin-bottom:20px"><div class="row" style="gap:10px 20px"><b>' + esc(T.fmtPer(per)) + ':</b>' +
        [['Sore Biasa', (r) => r.k === 'SB'], ['Sore Jumat', (r) => r.k === 'SJ'], ['TGC', (r) => r.k.indexOf('TGC') === 0], ['P3K', (r) => r.k.indexOf('P3K') === 0], ['Cuber', (r) => r.k === 'CUBER']]
          .map((x) => '<span class="row" style="gap:6px"><b class="tnum" style="font-size:18px">' + hit(x[1]) + '</b><span class="muted">' + x[0] + '</span></span>').join('') + '</div></div>' +
        '<section class="card"><div class="card-h">' + UI.seg('saya-tab', [['akan', 'Akan datang', 'upcoming'], ['riwayat', 'Riwayat', 'history']], st.tab) + '</div>' + isi + '</section>';
    }
  };
  DJ.on('saya-tab', (el) => { ui.saya.tab = el.dataset.v; DJ.render(); });
  DJ.on('saya-lagi', (el) => UI.sibuk(el, async () => { const st = ui.saya; const d = await DJ.api('jadwal.riwayatSaya', { halaman: st.halaman + 1 }); st.halaman++; st.riwayat = st.riwayat.concat(d.baris); DJ.render(); }));
  DJ.on('saya-ics', () => { const rows = Object.values(DJ.idx.jadwal).filter((r) => r.d === DJ.uid() && r.t >= DJ.data.hariIni && r.st === 'Terbit'); DJ.unduh('jadwal-jaga-saya.ics', DJ.ics(rows), 'text/calendar'); });
  DJ.on('saya-menu', (el) => {
    const r = DJ.idx.jadwal[el.dataset.id];
    UI.menu(el, [{ ikon: 'info', teks: 'Lihat detail', fn: () => DJ.detailJadwal(r.id) }, { ikon: 'swap_horiz', teks: 'Ajukan tukar', fn: () => DJ.wizardTukar(r.id) }, { ikon: 'event', teks: 'Tambah ke kalender (.ics)', fn: () => DJ.unduh('jaga-' + r.t + '.ics', DJ.ics([r]), 'text/calendar') }]);
  });

  /* ======================================================================
   * TUKAR JAGA
   * ==================================================================== */
  ui.tukar = { filter: 'saya' };
  function ringkasSlot(id) { const r = DJ.idx.jadwal[id]; return r ? DJ.kodePendek(r.k) + ' ' + T.fmtPendek(r.t) : '(jadwal lama)'; }
  function kartuTukar(t) {
    const me = DJ.uid(), asal = DJ.idx.jadwal[t.asal], batas = +DJ.set('Batas_Ajukan_Tukar_Hari') || 2;
    let aksi = '';
    if (t.status === 'Menunggu Rekan' && t.rekan === me) aksi = '<button class="btn sm danger-o" data-act="tukar-respon" data-id="' + t.id + '" data-v="0">' + ic('close') + 'Tolak</button><button class="btn sm pri" data-act="tukar-respon" data-id="' + t.id + '" data-v="1">' + ic('check') + 'Terima</button>';
    else if (t.status === 'Menunggu Persetujuan' && DJ.penyetujuSaya() && t.pemohon !== me && t.rekan !== me) aksi = '<button class="btn sm danger-o" data-act="tukar-putus" data-id="' + t.id + '" data-v="0">' + ic('close') + 'Tolak</button><button class="btn sm pri" data-act="tukar-putus" data-id="' + t.id + '" data-v="1">' + ic('check') + 'Setujui</button>';
    if (t.status.indexOf('Menunggu') === 0 && t.pemohon === me) aksi += '<button class="btn sm" data-act="tukar-batal" data-id="' + t.id + '">Batalkan</button>';
    return '<div class="kcard"><div class="row sb"><div class="av-stack">' + UI.av(t.pemohon, 'sm') + UI.av(t.rekan, 'sm') + '</div>' + UI.badge(t.jenis, t.jenis === 'Saling Tukar' ? 'b-blue' : 'b-purple') + '</div>' +
      '<div class="swap">' + esc(DJ.nama(t.pemohon)) + ' ' + ic('arrow_forward', 'muted') + ' ' + esc(DJ.nama(t.rekan)) + '</div>' +
      '<div class="row small" style="gap:6px">' + (asal ? UI.chip(asal.k) : '') + '<b>' + esc(ringkasSlot(t.asal)) + '</b>' + (t.balasan ? ic('sync_alt', 'muted') + (DJ.idx.jadwal[t.balasan] ? UI.chip(DJ.idx.jadwal[t.balasan].k) : '') + '<b>' + esc(ringkasSlot(t.balasan)) + '</b>' : '') + '</div>' +
      (t.alasan ? '<div class="q">“' + esc(t.alasan) + '”</div>' : '') +
      (t.catRekan ? '<div class="small muted">Catatan rekan: ' + esc(t.catRekan) + '</div>' : '') + (t.catatan ? '<div class="small muted">Catatan penyetuju: ' + esc(t.catatan) + '</div>' : '') +
      '<div class="row sb small muted"><span>' + esc(T.rel(t.tgl)) + '</span>' + (t.status.indexOf('Menunggu') === 0 && asal ? '<span>Batas: ' + esc(T.fmtPendek(T.add(asal.t, -1))) + '</span>' : UI.statusBadge(t.status)) + '</div>' +
      (aksi ? '<div class="row end">' + aksi + '</div>' : '') + '</div>';
  }
  H.tukar = {
    render() {
      const st = ui.tukar, me = DJ.uid(), hari = DJ.data.hariIni;
      const list = DJ.data.tukar.filter((t) => st.filter === 'semua' || t.pemohon === me || t.rekan === me || (t.status === 'Menunggu Persetujuan' && DJ.penyetujuSaya()));
      const kol = [
        ['c-a', 'Menunggu Rekan', list.filter((t) => t.status === 'Menunggu Rekan')],
        ['c-b', 'Menunggu Persetujuan', list.filter((t) => t.status === 'Menunggu Persetujuan')],
        ['c-c', 'Selesai (30 hari)', list.filter((t) => t.status.indexOf('Menunggu') !== 0 && T.diff((t.tglPutus || t.tgl).slice(0, 10), hari) <= 30)]
      ];
      const penyetuju = DJ.set('Penyetuju_Akhir') === 'ADMIN' ? 'Admin' : 'Kepala Puskesmas';
      return '<div class="page-h"><div><h1>Tukar Jaga</h1><p>Dua tahap: rekan menerima, lalu disetujui ' + penyetuju + '. Pengajuan paling lambat H-' + esc(DJ.set('Batas_Ajukan_Tukar_Hari') || 2) + '.</p></div><div class="row">' +
        UI.seg('tukar-filter', [['saya', 'Melibatkan saya'], ['semua', 'Semua']], st.filter) + (DJ.isDokter() ? '<button class="btn pri" data-act="tukar-baru">' + ic('add') + 'Ajukan Tukar</button>' : '') + '</div></div>' +
        '<div class="kanban">' + kol.map((c) => '<div class="col"><div class="col-h ' + c[0] + '"><span>' + c[1] + '</span><span class="n">' + c[2].length + '</span></div>' +
          (c[2].length ? c[2].sort((a, b) => (a.tgl < b.tgl ? 1 : -1)).map(kartuTukar).join('') : '<div class="col-empty">' + ic('inbox', 'muted') + '<span>Tidak ada permintaan</span></div>') + '</div>').join('') + '</div>';
    }
  };
  DJ.on('tukar-filter', (el) => { ui.tukar.filter = el.dataset.v; DJ.render(); });
  DJ.on('tukar-respon', async (el) => {
    const terima = el.dataset.v === '1';
    const cat = await UI.minta({ judul: terima ? 'Terima permintaan tukar?' : 'Tolak permintaan tukar?', label: 'Catatan untuk pemohon (opsional)', ok: terima ? 'Terima' : 'Tolak', bahaya: !terima });
    if (cat === null) return;
    await DJ.ubah(el, 'tukar.respon', { id: el.dataset.id, terima, catatan: cat }, terima ? 'Diterima. Menunggu persetujuan akhir.' : 'Permintaan ditolak');
  });
  DJ.on('tukar-putus', async (el) => {
    const setuju = el.dataset.v === '1';
    const cat = await UI.minta({ judul: setuju ? 'Setujui tukar jaga?' : 'Tolak tukar jaga?', pesan: setuju ? 'Jadwal, Google Calendar, dan beban akan dipindahkan ke dokter yang benar-benar bertugas.' : '', label: 'Catatan (opsional)', ok: setuju ? 'Setujui' : 'Tolak', bahaya: !setuju });
    if (cat === null) return;
    await DJ.ubah(el, 'tukar.putus', { id: el.dataset.id, setuju, catatan: cat }, setuju ? 'Tukar jaga disetujui' : 'Tukar jaga ditolak');
  });
  DJ.on('tukar-batal', async (el) => {
    if (!(await UI.konfirmasi({ judul: 'Batalkan permintaan?', pesan: 'Permintaan tukar ini akan dibatalkan.', ok: 'Batalkan', bahaya: true }))) return;
    await DJ.ubah(el, 'tukar.batal', { id: el.dataset.id }, 'Permintaan dibatalkan');
  });

  /* ---------- wizard ajukan tukar (3 langkah) ---------- */
  DJ.on('tukar-baru', (el) => { UI.tutupSemua(); DJ.wizardTukar(el.dataset.id || ''); });
  DJ.wizardTukar = (idAwal) => {
    if (!DJ.isDokter()) return UI.toast('Hanya dokter yang bisa mengajukan tukar jaga', 'warn');
    const me = DJ.uid(), hari = DJ.data.hariIni, batas = +DJ.set('Batas_Ajukan_Tukar_Hari') || 2;
    const sibukTukar = {}; DJ.data.tukar.forEach((t) => { if (t.status.indexOf('Menunggu') === 0) { sibukTukar[t.asal] = 1; if (t.balasan) sibukTukar[t.balasan] = 1; } });
    const milik = Object.values(DJ.idx.jadwal).filter((r) => r.d === me && r.st === 'Terbit' && T.diff(hari, r.t) >= batas && !sibukTukar[r.id] && DJ.statusPeriode(r.t.slice(0, 7)) !== 'Dikunci').sort((a, b) => (a.t < b.t ? -1 : 1));
    const s = { langkah: idAwal && milik.some((r) => r.id === idAwal) ? 2 : 1, asal: idAwal && milik.some((r) => r.id === idAwal) ? idAwal : '', jenis: 'Digantikan', opsi: null, rekan: '', balasan: '', alasan: '', muat: false };
    const laci = UI.laci({ judul: 'Ajukan Tukar Jaga', ikon: 'swap_horiz', isi: '', kaki: '<button class="btn" data-w="kembali">Kembali</button><button class="btn pri" data-w="lanjut">Lanjut</button>' });
    const b = laci.el.querySelector('.drawer-b'), f = laci.el.querySelector('.drawer-f');
    const muatOpsi = async () => {
      s.muat = true; s.opsi = null; s.rekan = ''; s.balasan = ''; gambar();
      try { s.opsi = await DJ.api('tukar.opsi', { idJadwal: s.asal, jenis: s.jenis }); } catch (e) { UI.galat(e); s.opsi = { rekan: [] }; }
      s.muat = false; gambar();
    };
    function gambar() {
      const langkah = '<div class="steps">' + [1, 2, 3].map((i) => '<span class="' + (i <= s.langkah ? 'on' : '') + '"></span>').join('') + '</div>';
      let isi = '';
      if (s.langkah === 1) {
        isi = '<div><b>1. Pilih jadwal Anda yang ingin ditukar</b><p class="small muted" style="margin:4px 0 0">Hanya jadwal terbit paling lambat H-' + batas + ' yang bisa ditukar.</p></div>' +
          (milik.length ? milik.map((r) => '<button type="button" class="opt' + (s.asal === r.id ? ' on' : '') + '" data-w="asal" data-id="' + r.id + '"><div class="datebox"><b>' + (+r.t.slice(8)) + '</b><small>' + T.HARI3[T.dow(r.t) - 1] + '</small></div><div class="grow"><b>' + esc(DJ.namaKeg(r.k)) + '</b><div class="small muted">' + esc(T.fmtPanjang(r.t)) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : '') + '</div></div>' + UI.chip(r.k) + '</button>').join('')
            : UI.empty('event_busy', 'Tidak ada jadwal yang bisa ditukar', 'Jadwal sudah terlalu dekat (kurang dari H-' + batas + '), belum terbit, atau sedang dalam permintaan tukar.'));
      } else if (s.langkah === 2) {
        const a = DJ.idx.jadwal[s.asal];
        isi = '<div class="callout">' + ic('event') + '<p>Jadwal Anda: <b>' + esc(DJ.namaKeg(a.k) + ' · ' + T.fmtPanjang(a.t)) + '</b></p></div><div><b>2. Jenis tukar & rekan</b></div>' +
          UI.seg('', [['Digantikan', 'Digantikan rekan'], ['Saling Tukar', 'Saling tukar']], s.jenis).replace(/data-act=""/g, 'data-w="jenis"') +
          '<p class="small muted" style="margin:0">' + (s.jenis === 'Digantikan' ? 'Rekan mengambil jadwal ini; beban pindah ke rekan.' : 'Anda dan rekan bertukar jadwal; masing-masing mengambil jadwal yang lain.') + '</p>';
        if (s.muat || !s.opsi) isi += UI.sk(4);
        else if (s.jenis === 'Digantikan') {
          isi += s.opsi.rekan.map((x) => '<button type="button" class="opt' + (x.boleh ? '' : ' no') + (s.rekan === x.id ? ' on' : '') + '" data-w="rekan" data-id="' + x.id + '"' + (x.boleh ? '' : ' disabled') + '>' + UI.av(x.id, 'sm') + '<div class="grow"><b>' + esc(x.nama) + '</b><div class="small ' + (x.boleh ? 'muted' : '') + '" style="' + (x.boleh ? '' : 'color:#B42318') + '">' + esc(x.boleh ? (x.catatan.length ? 'Peringatan: ' + x.catatan.join('; ') : 'Lolos aturan') : x.catatan.join('; ')) + '</div></div>' + (x.boleh ? ic('check_circle', '') : ic('block', 'muted')) + '</button>').join('');
        } else {
          isi += s.opsi.rekan.map((x) => '<div class="card" style="padding:12px;box-shadow:none"><div class="who" style="margin-bottom:8px">' + UI.av(x.id, 'sm') + '<div><b>' + esc(x.nama) + '</b><small>' + (x.slot.length ? x.slot.filter((y) => y.boleh).length + ' jadwal bisa ditukar' : 'Tidak ada jadwal terbit yang bisa ditukar') + '</small></div></div>' +
            x.slot.map((y) => '<button type="button" class="opt' + (y.boleh ? '' : ' no') + (s.balasan === y.id ? ' on' : '') + '" style="margin-top:6px" data-w="slot" data-id="' + y.id + '" data-rekan="' + x.id + '"' + (y.boleh ? '' : ' disabled') + '>' + UI.chip(y.k) + '<div class="grow"><b>' + esc(T.fmtPanjang(y.t)) + '</b><div class="small" style="color:' + (y.boleh ? 'var(--redup)' : '#B42318') + '">' + esc(y.catatan.length ? y.catatan.join('; ') : 'Lolos aturan') + '</div></div></button>').join('') + '</div>').join('');
        }
      } else {
        const a = DJ.idx.jadwal[s.asal], bl = s.balasan ? DJ.idx.jadwal[s.balasan] : null;
        isi = '<div><b>3. Alasan & kirim</b></div><div class="card" style="box-shadow:none;background:#F6F9F7"><div class="list">' +
          '<div class="li"><span class="muted" style="width:110px">Jenis</span><b>' + esc(s.jenis) + '</b></div><div class="li"><span class="muted" style="width:110px">Jadwal Anda</span><b>' + esc(DJ.namaKeg(a.k) + ' · ' + T.fmtPanjang(a.t)) + '</b></div>' +
          '<div class="li"><span class="muted" style="width:110px">Rekan</span>' + UI.who(s.rekan) + '</div>' + (bl ? '<div class="li"><span class="muted" style="width:110px">Jadwal rekan</span><b>' + esc(DJ.namaKeg(bl.k) + ' · ' + T.fmtPanjang(bl.t)) + '</b></div>' : '') + '</div></div>' +
          '<div class="field"><label for="wAlasan">Alasan <span class="req">*</span></label><textarea class="inp" id="wAlasan" maxlength="500" placeholder="Mis. mengikuti pelatihan ACLS dari Dinas Kesehatan">' + esc(s.alasan) + '</textarea></div>' +
          '<div class="callout info">' + ic('info') + '<p>Setelah dikirim, ' + esc(DJ.nama(s.rekan)) + ' perlu menerima, lalu ' + (DJ.set('Penyetuju_Akhir') === 'ADMIN' ? 'Admin' : 'Kepala Puskesmas') + ' menyetujui. Permintaan yang belum selesai sampai H-1 otomatis kedaluwarsa.</p></div>';
      }
      b.innerHTML = langkah + isi;
      const bisaLanjut = s.langkah === 1 ? !!s.asal : s.langkah === 2 ? !!s.rekan && (s.jenis === 'Digantikan' || !!s.balasan) : true;
      f.innerHTML = '<button class="btn" data-w="kembali">' + (s.langkah === 1 ? 'Batal' : 'Kembali') + '</button><button class="btn pri" data-w="lanjut"' + (bisaLanjut ? '' : ' disabled') + '>' + (s.langkah === 3 ? ic('send') + 'Kirim permintaan' : 'Lanjut') + '</button>';
    }
    laci.el.addEventListener('click', async (e) => {
      const w = e.target.closest('[data-w]'); if (!w || w.disabled) return;
      const a = w.dataset.w;
      if (a === 'asal') { s.asal = w.dataset.id; gambar(); }
      else if (a === 'jenis') { if (s.jenis !== w.dataset.v) { s.jenis = w.dataset.v; muatOpsi(); } }
      else if (a === 'rekan') { s.rekan = w.dataset.id; gambar(); }
      else if (a === 'slot') { s.balasan = w.dataset.id; s.rekan = w.dataset.rekan; gambar(); }
      else if (a === 'kembali') { if (s.langkah === 1) laci.tutup(); else { if (s.langkah === 3) s.alasan = (laci.el.querySelector('#wAlasan') || {}).value || ''; s.langkah--; gambar(); } }
      else if (a === 'lanjut') {
        if (s.langkah === 1) { s.langkah = 2; muatOpsi(); }
        else if (s.langkah === 2) { s.langkah = 3; gambar(); }
        else {
          s.alasan = laci.el.querySelector('#wAlasan').value.trim();
          if (!s.alasan) { UI.toast('Alasan wajib diisi', 'warn'); return; }
          try {
            await DJ.ubah(w, 'tukar.ajukan', { idJadwal: s.asal, jenis: s.jenis, idRekan: s.rekan, idBalasan: s.balasan, alasan: s.alasan }, 'Permintaan tukar terkirim ke ' + DJ.nama(s.rekan));
            laci.tutup(); if (location.hash !== '#/tukar') DJ.ke('tukar');
          } catch (x) { /* pesan sudah tampil */ }
        }
      }
    });
    if (s.langkah === 2) muatOpsi(); else gambar();
  };
})(window.DJ);
