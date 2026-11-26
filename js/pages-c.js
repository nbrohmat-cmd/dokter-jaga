/* pages-c.js — Laporan & Ekspor, Data Master (admin), Pengaturan (admin), Profil. */
'use strict';
(function (DJ) {
  const UI = DJ.UI, T = DJ.T, esc = DJ.esc, ic = UI.ic;
  const H = DJ.halaman = DJ.halaman || {};
  const ui = DJ.ui;
  const tab = (act, items, nilai) => '<div class="tabbar">' + UI.seg(act, items, nilai) + '</div>';
  const salin = async (teks) => { try { await navigator.clipboard.writeText(teks); UI.toast('Tersalin'); } catch (e) { UI.toast('Salin manual: ' + teks, 'info', 8000); } };
  DJ.on('salin', (el) => salin(el.dataset.teks || ''));

  /** Tampilkan PIN sekali (setelah pengguna baru / reset PIN). */
  DJ.tampilPin = (nama, pin) => {
    UI.modal({
      judul: 'PIN untuk ' + nama, kunci: true,
      isi: '<div class="pin-big tnum">' + esc(pin) + '</div><div class="callout warn">' + ic('warning') + '<p>Sampaikan PIN ini langsung kepada yang bersangkutan. <b>PIN hanya tampil sekali.</b> Saat masuk pertama ia wajib menggantinya.</p></div>',
      kaki: '<button class="btn" data-act="salin" data-teks="' + esc(pin) + '">' + ic('content_copy') + 'Salin PIN</button><button class="btn pri" data-tutup>Sudah dicatat</button>'
    });
  };

  /* ======================================================================
   * LAPORAN & EKSPOR
   * ==================================================================== */
  ui.lap = { per: '', sampai: '', dok: '', kode: '', hasilCek: null };
  function daftarPeriode() {
    const h = DJ.data.hariIni.slice(0, 7), set = {};
    DJ.data.periode.forEach((p) => { set[p.per] = 1; });
    set[h] = 1; set[T.shift(h, 1)] = 1;
    return Object.keys(set).sort().reverse();
  }
  async function barisBulan(per) { return DJ.jadwalBulan(per) || (await DJ.muatBulan(per)); }
  H.laporan = {
    render() {
      const st = ui.lap, pengelola = DJ.isPengelola(), kepala = DJ.isKepala(), b = DJ.data.beban;
      const pers = daftarPeriode();
      if (!st.per) st.per = DJ.statusPeriode(T.shift(DJ.data.hariIni.slice(0, 7), 1)) !== 'Draf' ? T.shift(DJ.data.hariIni.slice(0, 7), 1) : DJ.data.hariIni.slice(0, 7);
      if (!st.sampai) st.sampai = b.sampai;
      const statusPer = DJ.statusPeriode(st.per);
      const pilihPer = '<div class="field"><label>Bulan</label><select class="inp" data-chg="lap-per">' + UI.opsi(pers.map((p) => [p, T.fmtPer(p) + ' · ' + DJ.statusPeriode(p)]), st.per) + '</select></div>';
      const bulanBeban = []; for (let p = b.dari; p <= DJ.data.hariIni.slice(0, 7) && bulanBeban.length < 60; p = T.shift(p, 1)) bulanBeban.push(p);
      const kartu = (ikon, judul, sub, isi) => '<section class="card"><div class="row" style="align-items:flex-start;gap:14px;margin-bottom:14px"><span class="kpi"><span class="ic">' + ic(ikon) + '</span></span><div><h2 style="font-size:17px">' + esc(judul) + '</h2><p class="small muted" style="margin:2px 0 0">' + sub + '</p></div></div><div class="stack" style="gap:12px">' + isi + '</div></section>';
      const kartuJadwal = pengelola ? kartu('picture_as_pdf', 'Jadwal Bulanan (PDF)', 'Roster dokter × tanggal siap cetak. Versi sah memakai QR verifikasi dan tersimpan di Drive.',
        pilihPer + '<div class="row">' + '<button class="btn" data-act="lap-pdf" data-sah="0">' + ic('draft') + 'PDF draf</button>' +
        (kepala ? '<button class="btn pri" data-act="lap-pdf" data-sah="1"' + (statusPer === 'Draf' ? ' disabled title="Terbitkan dulu"' : '') + '>' + ic('verified') + 'Sahkan & cetak</button>' : '') + '</div>' +
        (kepala && statusPer === 'Draf' ? '<p class="small muted" style="margin:0">Pengesahan tersedia setelah jadwal diterbitkan Admin.</p>' : '')) : '';
      const kartuRekap = kartu('summarize', 'Rekap Beban Jaga (PDF)', pengelola ? 'Realisasi, target, dan selisih per dokter (kumulatif termasuk saldo awal).' : 'Rekap beban jaga Anda sendiri, kumulatif sampai bulan yang dipilih.',
        '<div class="form-grid"><div class="field"><label>Sampai bulan</label><select class="inp" data-chg="lap-sampai">' + UI.opsi(bulanBeban.reverse().map((p) => [p, T.fmtPer(p)]), st.sampai) + '</select></div>' +
        (pengelola ? '<div class="field"><label>Dokter</label><select class="inp" data-chg="lap-dok">' + UI.opsi([['', 'Semua dokter']].concat(DJ.idx.dokter.map((d) => [d.id, d.nama])), st.dok) + '</select></div>' : '') + '</div>' +
        '<div class="row"><button class="btn" data-act="lap-rekap" data-sah="0">' + ic('picture_as_pdf') + 'PDF rekap</button>' + (kepala ? '<button class="btn pri" data-act="lap-rekap" data-sah="1">' + ic('verified') + 'Sahkan & cetak</button>' : '') + '</div>');
      const kartuExcel = kartu('table_view', 'Ekspor Excel', 'Untuk diolah lebih lanjut atau dilampirkan ke laporan.',
        (pengelola ? '' : pilihPer) + '<div class="list">' +
        '<div class="li">' + ic('calendar_month', 'muted') + '<div class="grow"><b>Jadwal ' + esc(T.fmtPer(st.per)) + '</b><div class="small muted">Daftar + matriks dokter × tanggal</div></div><button class="btn sm" data-act="lap-xlsx-jadwal">' + ic('download') + '.xlsx</button></div>' +
        '<div class="li">' + ic('balance', 'muted') + '<div class="grow"><b>Rekap beban kumulatif</b><div class="small muted">Sampai ' + esc(T.fmtPer(st.sampai)) + '</div></div><button class="btn sm" data-act="lap-xlsx-beban">' + ic('download') + '.xlsx</button></div>' +
        '<div class="li">' + ic('swap_horiz', 'muted') + '<div class="grow"><b>Riwayat tukar jaga</b><div class="small muted">' + DJ.data.tukar.length + ' permintaan (90 hari terakhir + yang menunggu)</div></div><button class="btn sm" data-act="lap-xlsx-tukar">' + ic('download') + '.xlsx</button></div></div>');
      const kartuIcs = kartu('event', 'Kalender (.ics)', 'Impor ke Google Calendar, Outlook, atau kalender HP. Jadwal terbit juga otomatis dikirim ke Google Calendar dokter.',
        '<div class="row">' + (DJ.isDokter() ? '<button class="btn" data-act="saya-ics">' + ic('person') + 'Jadwal saya (mendatang)</button>' : '') + (pengelola ? '<button class="btn" data-act="lap-ics">' + ic('groups') + 'Semua dokter · ' + esc(T.fmtPer(st.per)) + '</button>' : '') + '</div>');
      const h = st.hasilCek;
      const kartuCek = kartu('qr_code_scanner', 'Cek Keaslian Dokumen', 'Tempel kode dari QR pada PDF yang disahkan.',
        '<div class="row"><input class="inp" id="lapKode" style="flex:1;min-width:200px" placeholder="Mis. DOK-1A2B3C4D.9f8e7d6c" value="' + esc(st.kode) + '"><button class="btn pri" data-act="lap-cek">' + ic('search') + 'Periksa</button></div>' +
        (h ? (h.sah ? '<div class="callout">' + ic('verified') + '<p><b>Dokumen asli.</b> ' + esc(h.jenis + ' ' + h.periode) + ' · disahkan ' + esc(h.disahkanOleh) + ' pada ' + esc(h.tanggal) + ' · ' + esc(h.puskesmas) + '</p></div>'
          : '<div class="callout bad">' + ic('gpp_bad') + '<p><b>Tidak terverifikasi.</b> Kode tidak dikenal, salah ketik, atau dokumen sudah dicabut.</p></div>') : ''));
      return '<div class="page-h"><div><h1>Laporan & Ekspor</h1><p>Cetak roster resmi, rekap beban, dan unduh data untuk arsip.</p></div></div>' +
        '<div class="grid g2">' + kartuJadwal + kartuRekap + kartuExcel + kartuIcs + kartuCek + '</div>';
    }
  };
  DJ.on('lap-per', (el) => { ui.lap.per = el.value; DJ.render(); });
  DJ.on('lap-sampai', (el) => { ui.lap.sampai = el.value; DJ.render(); });
  DJ.on('lap-dok', (el) => { ui.lap.dok = el.value; });
  DJ.on('lap-pdf', (el) => DJ.cetakJadwal(el, ui.lap.per, el.dataset.sah === '1'));
  DJ.on('lap-rekap', (el) => UI.sibuk(el, async () => {
    const sah = el.dataset.sah === '1';
    try { const r = await DJ.api('laporan.pdfRekap', { sampai: ui.lap.sampai, idDokter: ui.lap.dok, sahkan: sah }, { timeout: 90000 }); UI.bukaPdf(r); UI.toast(sah ? 'Rekap disahkan & tersimpan di Drive' : 'PDF rekap dibuat'); }
    catch (e) { UI.galat(e); }
  }));
  DJ.on('lap-cek', (el) => UI.sibuk(el, async () => {
    const kode = document.getElementById('lapKode').value.trim(); ui.lap.kode = kode;
    if (!kode) return UI.toast('Tempel kode dokumen dulu', 'warn');
    try { ui.lap.hasilCek = await DJ.api('dok.verifikasi', { kode }); DJ.render(); } catch (e) { UI.galat(e); }
  }));
  DJ.on('lap-ics', (el) => UI.sibuk(el, async () => {
    try { const rows = (await barisBulan(ui.lap.per)).filter((r) => r.d && r.st !== 'Batal'); DJ.unduh('jadwal-jaga-' + ui.lap.per + '.ics', DJ.ics(rows), 'text/calendar'); } catch (e) { UI.galat(e); }
  }));
  DJ.on('lap-xlsx-jadwal', (el) => UI.sibuk(el, async () => {
    try {
      const per = ui.lap.per, rows = (await barisBulan(per)).filter((r) => r.st !== 'Batal').sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : DJ.urutKeg(a, b)));
      const daftar = rows.map((r) => [r.t, T.HARI[T.dow(r.t) - 1], DJ.namaKeg(r.k), DJ.jam(r.k), r.d ? DJ.nama(r.d) : '(belum terisi)', r.st, (r.ag && DJ.idx.agenda[r.ag] ? DJ.idx.agenda[r.ag].nama : r.lok || ''), (DJ.hariLibur(r.t) || {}).ket || '', r.al || '']);
      const tgl = T.dates(per), dok = DJ.idx.dokter.filter((u) => rows.some((r) => r.d === u.id) || tgl.some((t) => DJ.aktifPada(u, t)));
      const mx = dok.map((u) => [u.nama].concat(tgl.map((t) => rows.filter((r) => r.d === u.id && r.t === t).map((r) => DJ.kodePendek(r.k)).join(', '))).concat([rows.filter((r) => r.d === u.id).length]));
      DJ.unduh('Jadwal Jaga ' + T.fmtPer(per) + '.xlsx', DJ.xlsx([
        { nama: 'Daftar', kolom: ['Tanggal', 'Hari', 'Kegiatan', 'Jam', 'Dokter', 'Status', 'Agenda/Lokasi', 'Hari libur', 'Alasan penugasan'], baris: daftar, lebar: [12, 9, 22, 13, 24, 15, 30, 22, 50] },
        { nama: 'Matriks', kolom: ['Dokter'].concat(tgl.map((t) => String(+t.slice(8)) + ' ' + T.HARI3[T.dow(t) - 1])).concat(['Total']), baris: mx, lebar: [24].concat(tgl.map(() => 8), [8]) }
      ]));
    } catch (e) { UI.galat(e); }
  }));
  DJ.on('lap-xlsx-beban', (el) => UI.sibuk(el, async () => {
    try {
      const st = ui.lap, b = st.sampai === DJ.data.beban.sampai ? DJ.data.beban : await DJ.api('beban.ringkasan', { sampai: st.sampai });
      const g = b.kelompok, rows = DJ.isPengelola() ? b.dokter : b.dokter.filter((d) => d.id === DJ.uid());
      const kolom = ['Dokter', 'Status'].concat(...g.map((x) => [DJ.labelKel(x) + ' realisasi', DJ.labelKel(x) + ' target', DJ.labelKel(x) + ' selisih'])).concat(['Total poin']);
      const baris = rows.map((d) => [DJ.nama(d.id), d.status].concat(...g.map((x) => [d.real[x] || 0, d.target[x] || 0, Math.round(((d.real[x] || 0) - (d.target[x] || 0)) * 10) / 10])).concat([d.poin || 0]));
      const riw = b.riwayat.map((x) => [T.fmtPer(x.per), x.selisih]);
      DJ.unduh('Rekap Beban sd ' + T.fmtPer(st.sampai) + '.xlsx', DJ.xlsx([{ nama: 'Rekap', kolom, baris, lebar: [24, 10].concat(g.map(() => [12, 10, 10]).flat(), [10]) }, { nama: 'Riwayat Selisih', kolom: ['Bulan', 'Rata-rata rentang selisih'], baris: riw, lebar: [18, 24] }]));
    } catch (e) { UI.galat(e); }
  }));
  DJ.on('lap-xlsx-tukar', () => {
    const baris = DJ.data.tukar.slice().sort((a, b) => (a.tgl < b.tgl ? 1 : -1)).map((t) => {
      const a = DJ.idx.jadwal[t.asal], b = t.balasan ? DJ.idx.jadwal[t.balasan] : null;
      return [String(t.tgl).slice(0, 16).replace('T', ' '), t.jenis, DJ.nama(t.pemohon), DJ.nama(t.rekan), a ? DJ.namaKeg(a.k) + ' ' + a.t : t.asal, b ? DJ.namaKeg(b.k) + ' ' + b.t : '', t.alasan, t.status, t.catRekan || '', t.catatan || '', t.penyetuju ? DJ.nama(t.penyetuju) : ''];
    });
    DJ.unduh('Riwayat Tukar Jaga.xlsx', DJ.xlsx([{ nama: 'Tukar Jaga', kolom: ['Diajukan', 'Jenis', 'Pemohon', 'Rekan', 'Jadwal pemohon', 'Jadwal rekan', 'Alasan', 'Status', 'Catatan rekan', 'Catatan penyetuju', 'Diputus oleh'], baris, lebar: [17, 13, 22, 22, 26, 26, 40, 20, 26, 26, 22] }]));
  });

  /* ======================================================================
   * DATA MASTER (Admin)
   * ==================================================================== */
  ui.master = { tab: 'dokter', pengguna: null, impor: null, hasilImpor: null, log: null, logCari: '', logHal: 1, logTotal: 0, tahun: '', lama: null };
  const HARI_KODE = [['1', 'Sen'], ['2', 'Sel'], ['3', 'Rab'], ['4', 'Kam'], ['5', 'Jum'], ['6', 'Sab'], ['7', 'Min']];
  const muatPengguna = async () => { ui.master.pengguna = await DJ.api('pengguna.list', {}); };

  function tabDokter() {
    const st = ui.master;
    if (!st.pengguna) { muatPengguna().then(DJ.render).catch(UI.galat); return '<section class="card">' + UI.sk(6) + '</section>'; }
    const urut = st.pengguna.slice().sort((a, b) => (a.akun === 'Aktif' ? 0 : 1) - (b.akun === 'Aktif' ? 0 : 1) || (a.peran.indexOf('DOKTER') > -1 ? 0 : 1) - (b.peran.indexOf('DOKTER') > -1 ? 0 : 1) || a.nama.localeCompare(b.nama));
    const tanpaEmail = urut.filter((u) => u.akun === 'Aktif' && !u.email);
    return (tanpaEmail.length ? '<div class="callout warn" style="margin-bottom:16px">' + ic('mail') + '<p><b>' + tanpaEmail.length + ' akun belum punya email</b> (' + tanpaEmail.map((u) => esc(u.nama)).join(', ') + '). Isi email agar mereka bisa masuk; PIN awal dibuat otomatis dan ditampilkan sekali.</p></div>' : '') +
      '<section class="card"><div class="card-h"><h2>Dokter & Pengguna</h2><button class="btn pri" data-act="ms-user" data-id="">' + ic('person_add') + 'Tambah</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Peran</th><th class="hide-m">Masa aktif</th><th class="hide-m">Masuk</th><th>Akun</th><th></th></tr></thead><tbody>' +
      urut.map((u) => '<tr><td>' + UI.who(u.id, esc(u.email || 'Belum ada email'), 'sm') + '</td><td><div class="row" style="gap:4px">' + u.peran.map((p) => UI.badge(p === 'DOKTER' ? 'Dokter ' + (u.status || '') : p === 'KEPALA' ? 'Kepala' : 'Admin', p === 'ADMIN' ? 'b-purple' : p === 'KEPALA' ? 'b-blue' : u.status === 'Pengganti' ? 'b-mint' : 'b-green')).join('') + '</div></td>' +
        '<td class="hide-m small">' + (u.mulai || u.selesai ? esc((u.mulai ? T.fmt(u.mulai) : '…') + ' – ' + (u.selesai ? T.fmt(u.selesai) : 'sekarang')) : '<span class="muted">-</span>') + '</td>' +
        '<td class="hide-m">' + (!u.email ? UI.badge('Belum bisa', 'b-gray') : u.wajibGantiPin ? UI.badge('Menunggu ganti PIN', 'b-amber') : u.punyaPin ? UI.badge('PIN aktif', 'b-green') : UI.badge('Belum ada PIN', 'b-amber')) + '</td>' +
        '<td>' + UI.statusBadge(u.akun) + '</td><td class="acts"><button class="btn sm" data-act="ms-user" data-id="' + u.id + '">' + ic('edit') + 'Ubah</button>' + (u.email ? '<button class="ico-btn" data-act="ms-resetpin" data-id="' + u.id + '" title="Reset PIN" aria-label="Reset PIN">' + ic('key') + '</button>' : '') + '</td></tr>').join('') +
      '</tbody></table></div></section>';
  }
  DJ.on('ms-resetpin', async (el) => {
    const u = ui.master.pengguna.find((x) => x.id === el.dataset.id);
    if (!(await UI.konfirmasi({ judul: 'Reset PIN ' + u.nama + '?', pesan: 'PIN lama tidak berlaku lagi dan semua perangkatnya keluar. PIN baru ditampilkan sekali.', ok: 'Reset PIN', bahaya: true }))) return;
    await UI.sibuk(el, async () => { try { const r = await DJ.api('pengguna.resetPin', { id: u.id }); await muatPengguna(); DJ.render(); DJ.tampilPin(u.nama, r.pin); } catch (e) { UI.galat(e); } });
  });
  DJ.on('ms-user', (el) => {
    const id = el.dataset.id, u = id ? ui.master.pengguna.find((x) => x.id === id) : { nama: '', singkat: '', alias: '', nip: '', email: '', noHp: '', peran: ['DOKTER'], status: 'Tetap', mulai: '', selesai: '', warna: '#1E7A4F', notifWa: false, akun: 'Aktif' };
    const laci = UI.laci({
      judul: id ? 'Ubah ' + u.nama : 'Tambah Pengguna', ikon: 'person', isi: '<form class="form-grid" id="fUser" novalidate>' +
        '<div class="field full"><label>Nama lengkap <span class="req">*</span></label><input class="inp" name="nama" maxlength="120" value="' + esc(u.nama) + '" placeholder="dr. Nama Lengkap"></div>' +
        '<div class="field"><label>Nama singkat</label><input class="inp" name="singkat" maxlength="60" value="' + esc(u.singkat) + '" placeholder="Untuk chip kalender"></div>' +
        '<div class="field"><label>Warna</label><input class="inp" type="color" name="warna" value="' + esc(u.warna || '#1E7A4F') + '" style="padding:4px;height:44px"></div>' +
        '<div class="field"><label>Email (untuk masuk & kalender)</label><input class="inp" type="email" name="email" maxlength="120" value="' + esc(u.email) + '"></div>' +
        '<div class="field"><label>No. HP / WA</label><input class="inp" name="noHp" inputmode="tel" maxlength="20" value="' + esc(u.noHp) + '" placeholder="08xx"></div>' +
        '<div class="field"><label>NIP</label><input class="inp" name="nip" maxlength="40" value="' + esc(u.nip) + '"></div>' +
        '<div class="field"><label>Status akun</label><select class="inp" name="statusAkun">' + UI.opsi(['Aktif', 'Nonaktif'], u.akun) + '</select></div>' +
        '<div class="field full"><label>Peran</label><div class="row">' + [['DOKTER', 'Dokter'], ['KEPALA', 'Kepala Puskesmas'], ['ADMIN', 'Admin']].map((p) => '<label class="chk"><input type="checkbox" name="peran" value="' + p[0] + '"' + (u.peran.indexOf(p[0]) > -1 ? ' checked' : '') + '>' + p[1] + '</label>').join('') + '</div></div>' +
        '<div class="field" data-dok><label>Status dokter</label><select class="inp" name="status">' + UI.opsi(['Tetap', 'Pengganti'], u.status || 'Tetap') + '</select></div>' +
        '<div class="field" data-dok><label class="chk" style="min-height:auto;margin-top:26px"><input type="checkbox" name="notifWa"' + (u.notifWa ? ' checked' : '') + '>Terima notifikasi WA</label></div>' +
        '<div class="field" data-dok><label>Aktif mulai</label><input class="inp" type="date" name="aktifMulai" value="' + esc(u.mulai || '') + '"><small>Kosongkan untuk dokter tetap lama; dokter baru otomatis mulai hari ini.</small></div>' +
        '<div class="field" data-dok><label>Aktif sampai</label><input class="inp" type="date" name="aktifSelesai" value="' + esc(u.selesai || '') + '"><small>Isi untuk dokter pengganti.</small></div>' +
        '<div class="field full" data-dok><label>Alias di jadwal lama</label><input class="inp" name="alias" maxlength="300" value="' + esc(u.alias) + '" placeholder="Pisahkan dengan koma, mis. Frida, dr Frida"><small>Dipakai saat mengimpor data dari Excel lama.</small></div>' +
        '</form>',
      kaki: '<button class="btn" data-tutup>Batal</button><button class="btn pri" id="uSimpan">' + ic('save') + 'Simpan</button>'
    });
    const f = laci.el.querySelector('#fUser');
    const sinkron = () => { const dok = Array.from(f.querySelectorAll('[name=peran]')).some((x) => x.checked && x.value === 'DOKTER'); laci.el.querySelectorAll('[data-dok]').forEach((x) => { x.hidden = !dok; }); };
    f.addEventListener('change', sinkron); sinkron();
    laci.el.querySelector('#uSimpan').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      const peran = Array.from(f.querySelectorAll('[name=peran]:checked')).map((x) => x.value);
      if (!f.nama.value.trim()) return UI.toast('Nama wajib diisi', 'warn');
      if (!peran.length) return UI.toast('Pilih minimal satu peran', 'warn');
      const p = { id, nama: f.nama.value, singkat: f.singkat.value, alias: f.alias.value, nip: f.nip.value, email: f.email.value.trim(), noHp: f.noHp.value, peran,
        status: peran.indexOf('DOKTER') > -1 ? f.status.value : '', aktifMulai: f.aktifMulai.value, aktifSelesai: f.aktifSelesai.value, warna: f.warna.value, notifWa: f.notifWa.checked, statusAkun: f.statusAkun.value };
      try {
        const r = await DJ.api('pengguna.simpan', p);
        await Promise.all([muatPengguna(), DJ.segarkan().catch(() => { })]);
        laci.tutup(); DJ.render(); UI.toast('Data pengguna tersimpan');
        if (r.pinAwal) DJ.tampilPin(p.nama, r.pinAwal);
      } catch (x) { UI.galat(x); }
    }));
  });

  function tabKegiatan() {
    const list = DJ.data.kegiatan.slice().sort((a, b) => a.urut - b.urut);
    const hari = (k) => (k.pola === 'Rutin' ? String(k.hari || '').split(',').filter(Boolean).map((h) => (HARI_KODE[+h - 1] || [])[1]).join(', ') : k.pola === 'Siklus' ? 'Siklus TGC' : k.pola === 'Agenda' ? 'Sesuai agenda' : 'Otomatis');
    return '<section class="card"><div class="card-h"><div><h2>Jenis Kegiatan</h2><p>Jam, poin, dan jumlah dokter per slot. Kegiatan baru selalu berpola rutin (hari tetap) dan otomatis punya kelompok beban sendiri.</p></div><button class="btn pri" data-act="ms-keg" data-id="">' + ic('add') + 'Tambah kegiatan</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kegiatan</th><th class="hide-m">Kelompok</th><th>Hari</th><th>Jam</th><th class="hide-m">Dokter/slot</th><th class="hide-m">Poin</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map((k) => '<tr><td><div class="row" style="gap:8px">' + UI.chip(k.kode) + '<b>' + esc(k.nama) + '</b></div></td><td class="hide-m">' + esc(k.kelompok) + '</td><td class="small">' + esc(hari(k)) + '</td><td class="small tnum">' + esc(DJ.jam(k.kode) || '-') + '</td><td class="hide-m tnum">' + k.perSlot + '</td><td class="hide-m tnum">' + k.poin + '</td><td>' + UI.statusBadge(k.aktif ? 'Aktif' : 'Nonaktif') + '</td>' +
        '<td class="acts">' + (k.kode !== 'LPT' ? '<button class="btn sm" data-act="ms-keg" data-id="' + k.id + '">' + ic('edit') + 'Ubah</button>' : '') + '</td></tr>').join('') + '</tbody></table></div></section>';
  }
  DJ.on('ms-keg', (el) => {
    const k = el.dataset.id ? DJ.data.kegiatan.find((x) => x.id === el.dataset.id) : { kode: '', nama: '', kelompok: 'Dalam Gedung', pola: 'Rutin', hari: '1,2,3,4', jamMulai: '', jamSelesai: '', perSlot: 1, poin: 1, warna: '#2E9E5B', aktif: true };
    const baru = !el.dataset.id, hariSet = String(k.hari || '').split(',');
    const laci = UI.laci({
      judul: baru ? 'Tambah Kegiatan Rutin' : 'Ubah ' + k.nama, ikon: 'category', isi: '<form class="form-grid" id="fKeg" novalidate>' +
        (baru ? '<div class="field"><label>Kode <span class="req">*</span></label><input class="inp" name="kode" maxlength="12" placeholder="Mis. POSBINDU" style="text-transform:uppercase"></div><div class="field"><label>Kelompok</label><select class="inp" name="kelompok">' + UI.opsi(['Dalam Gedung', 'Luar Gedung'], k.kelompok) + '</select></div>' : '<div class="field full">' + UI.chip(k.kode, { cls: 'solid' }) + ' <span class="small muted">' + esc(k.kelompok + ' · pola ' + k.pola) + '</span></div>') +
        '<div class="field full"><label>Nama <span class="req">*</span></label><input class="inp" name="nama" maxlength="80" value="' + esc(k.nama) + '"></div>' +
        (k.pola === 'Rutin' ? '<div class="field full"><label>Hari berlaku</label><div class="row">' + HARI_KODE.map((h) => '<label class="chk"><input type="checkbox" name="hari" value="' + h[0] + '"' + (hariSet.indexOf(h[0]) > -1 ? ' checked' : '') + '>' + h[1] + '</label>').join('') + '</div><small>Tidak berlaku pada hari libur nasional/cuti bersama.</small></div>' : '') +
        '<div class="field"><label>Jam mulai</label><input class="inp" type="time" name="jamMulai" value="' + esc((k.jamMulai || '').replace('.', ':')) + '"></div><div class="field"><label>Jam selesai</label><input class="inp" type="time" name="jamSelesai" value="' + esc((k.jamSelesai || '').replace('.', ':')) + '"><small>Bila lebih awal dari jam mulai, dianggap lewat tengah malam.</small></div>' +
        '<div class="field"><label>Dokter per slot</label><input class="inp" type="number" min="0" max="10" name="perSlot" value="' + k.perSlot + '"></div><div class="field"><label>Poin beban</label><input class="inp" type="number" min="0" max="10" step="0.5" name="poin" value="' + k.poin + '"></div>' +
        '<div class="field"><label>Warna</label><input class="inp" type="color" name="warna" value="' + esc(k.warna || '#2E9E5B') + '" style="padding:4px;height:44px"></div><div class="field"><label class="chk" style="margin-top:26px"><input type="checkbox" name="aktif"' + (k.aktif ? ' checked' : '') + '>Aktif</label></div>' +
        '</form><div class="callout info">' + ic('info') + '<p>Perubahan jam berlaku untuk jadwal yang diterbitkan berikutnya dan sinkron kalender selanjutnya.</p></div>',
      kaki: '<button class="btn" data-tutup>Batal</button><button class="btn pri" id="kSimpan">' + ic('save') + 'Simpan</button>'
    });
    const f = laci.el.querySelector('#fKeg');
    laci.el.querySelector('#kSimpan').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      const hari = Array.from(f.querySelectorAll('[name=hari]:checked')).map((x) => x.value).join(',');
      if (!f.nama.value.trim()) return UI.toast('Nama wajib diisi', 'warn');
      if (k.pola === 'Rutin' && !hari) return UI.toast('Pilih minimal satu hari', 'warn');
      const p = { id: baru ? '' : k.id, kode: baru ? f.kode.value.trim().toUpperCase() : k.kode, nama: f.nama.value, kelompok: baru ? f.kelompok.value : k.kelompok, pola: k.pola, hari: k.pola === 'Rutin' ? hari : '', jamMulai: f.jamMulai.value, jamSelesai: f.jamSelesai.value, perSlot: f.perSlot.value, poin: f.poin.value, warna: f.warna.value, aktif: f.aktif.checked };
      try { await DJ.api('kegiatan.simpan', p); await DJ.segarkan().catch(() => { }); laci.tutup(); DJ.render(); UI.toast('Kegiatan tersimpan'); } catch (x) { UI.galat(x); }
    }));
  });

  function tabLibur() {
    const st = ui.master, th = st.tahun || DJ.data.hariIni.slice(0, 4);
    const tahun = Array.from(new Set(DJ.data.libur.map((l) => l.t.slice(0, 4)).concat([DJ.data.hariIni.slice(0, 4), String(+DJ.data.hariIni.slice(0, 4) + 1)]))).sort().reverse();
    const list = DJ.data.libur.filter((l) => l.t.slice(0, 4) === th).sort((a, b) => (a.t < b.t ? -1 : 1));
    return '<section class="card"><div class="card-h"><div><h2>Hari Libur & Cuti Bersama</h2><p>Piket sore tidak berjalan pada hari libur. TGC pada hari libur dihitung sebagai TGC Libur. Centang "Piket Cuber" bila ada piket Cuti Bersama.</p></div><div class="row">' +
      UI.pillSel('ms-tahun', 'calendar_today', tahun.map((y) => [y, y]), th, 'Tahun') + '<button class="btn" data-act="ms-impor-libur" data-th="' + th + '">' + ic('cloud_download') + 'Ambil dari Google</button><button class="btn pri" data-act="ms-libur" data-t="">' + ic('add') + 'Tambah</button></div></div>' +
      (list.length ? '<div class="list">' + list.map((l) => '<div class="li"><div class="datebox libur"><b>' + (+l.t.slice(8)) + '</b><small>' + T.BULAN3[+l.t.slice(5, 7) - 1] + '</small></div><div class="grow"><b>' + esc(l.ket) + '</b><div class="small muted">' + esc(T.HARI[T.dow(l.t) - 1] + ' · ' + l.jenis + ' · ' + (l.sumber || 'Manual')) + '</div></div>' +
        (l.cuber ? UI.badge('Piket Cuber', 'b-purple') : '') + '<button class="ico-btn" data-act="ms-libur" data-t="' + l.t + '" aria-label="Ubah">' + ic('edit') + '</button><button class="ico-btn" data-act="ms-libur-hapus" data-t="' + l.t + '" aria-label="Hapus">' + ic('delete') + '</button></div>').join('') + '</div>'
        : UI.empty('event_busy', 'Belum ada hari libur ' + th, 'Ambil otomatis dari kalender libur Indonesia di Google, lalu periksa cuti bersama.', '<button class="btn pri" data-act="ms-impor-libur" data-th="' + th + '">' + ic('cloud_download') + 'Ambil dari Google</button>')) + '</section>';
  }
  DJ.on('ms-tahun', (el) => { ui.master.tahun = el.value; DJ.render(); });
  DJ.on('ms-impor-libur', (el) => UI.sibuk(el, async () => {
    try { const r = await DJ.api('libur.impor', { tahun: +el.dataset.th }, { timeout: 60000 }); await DJ.segarkan().catch(() => { }); DJ.render(); UI.toast('Libur ' + r.tahun + ': ' + r.tambah + ' ditambah, ' + r.ubah + ' diperbarui, ' + r.lewati + ' dilewati'); }
    catch (e) { UI.galat(e); }
  }));
  DJ.on('ms-libur-hapus', async (el) => {
    const l = DJ.idx.libur[el.dataset.t];
    if (!(await UI.konfirmasi({ judul: 'Hapus hari libur?', pesan: T.fmtPanjang(l.t) + ' — ' + l.ket + '. Jadwal yang sudah ada tidak berubah otomatis; susun ulang bulan draf bila perlu.', ok: 'Hapus', bahaya: true }))) return;
    try { await DJ.ubah(el, 'libur.hapus', { tanggal: l.t }, 'Hari libur dihapus'); } catch (e) { }
  });
  DJ.on('ms-libur', (el) => {
    const l = el.dataset.t ? DJ.idx.libur[el.dataset.t] : { t: '', ket: '', jenis: 'Libur Nasional', cuber: false };
    const laci = UI.laci({
      judul: el.dataset.t ? 'Ubah Hari Libur' : 'Tambah Hari Libur', ikon: 'event_busy', isi: '<form class="form-grid" id="fLib" novalidate>' +
        '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="inp" type="date" name="tanggal" value="' + esc(l.t) + '"' + (el.dataset.t ? ' readonly' : '') + '></div>' +
        '<div class="field"><label>Jenis</label><select class="inp" name="jenis">' + UI.opsi(['Libur Nasional', 'Cuti Bersama', 'Libur Daerah'], l.jenis) + '</select></div>' +
        '<div class="field full"><label>Keterangan <span class="req">*</span></label><input class="inp" name="keterangan" maxlength="120" value="' + esc(l.ket) + '" placeholder="Mis. Cuti Bersama Natal"></div>' +
        '<div class="field full"><label class="chk"><input type="checkbox" name="cuber"' + (l.cuber ? ' checked' : '') + '>Ada piket Cuti Bersama (Cuber) pada tanggal ini</label></div></form>',
      kaki: '<button class="btn" data-tutup>Batal</button><button class="btn pri" id="lSimpan">' + ic('save') + 'Simpan</button>'
    });
    const f = laci.el.querySelector('#fLib');
    laci.el.querySelector('#lSimpan').addEventListener('click', async (e) => {
      if (!f.tanggal.value || !f.keterangan.value.trim()) return UI.toast('Tanggal dan keterangan wajib diisi', 'warn');
      try { await DJ.ubah(e.currentTarget, 'libur.simpan', { tanggal: f.tanggal.value, keterangan: f.keterangan.value, jenis: f.jenis.value, adaPiketCuber: f.cuber.checked }, 'Hari libur tersimpan'); laci.tutup(); } catch (x) { }
    });
  });

  function tabTgc() {
    return '<div class="grid g-7-5"><section class="card"><div class="card-h"><div><h2>Siklus TGC</h2><p>TGC berjalan tiap beberapa hari dengan sesi bergiliran. Ubah hanya bila siklus di lapangan berubah.</p></div></div><form class="form-grid" id="fTgc" novalidate>' +
      '<div class="field"><label>Tanggal acuan</label><input class="inp" type="date" name="TGC_Tanggal_Acuan" value="' + esc(DJ.set('TGC_Tanggal_Acuan')) + '"><small>Tanggal yang pasti ada TGC.</small></div>' +
      '<div class="field"><label>Sesi pada tanggal acuan</label><select class="inp" name="TGC_Sesi_Acuan">' + UI.opsi([['P', 'Pagi'], ['S', 'Siang'], ['M', 'Malam']], DJ.set('TGC_Sesi_Acuan')) + '</select></div>' +
      '<div class="field"><label>Jarak antar TGC (hari)</label><input class="inp" type="number" min="1" max="30" name="TGC_Interval_Hari" value="' + esc(DJ.set('TGC_Interval_Hari')) + '"></div>' +
      '<div class="field"><label>Urutan sesi</label><input class="inp" name="TGC_Urutan_Sesi" value="' + esc(DJ.set('TGC_Urutan_Sesi')) + '" placeholder="P,S,M"><small>Huruf P/S/M dipisah koma.</small></div>' +
      '<div class="field full"><label>Libur pasca TGC Malam (aturan R2)</label><select class="inp" name="LPT_Aktif">' + UI.opsi([['Ya', 'Ya — hari sesudah TGC Malam tidak dijadwalkan'], ['Tidak', 'Tidak']], DJ.set('LPT_Aktif')) + '</select></div>' +
      '<div class="full row end"><button class="btn pri" type="button" data-act="ms-tgc-simpan">' + ic('save') + 'Simpan siklus</button></div></form></section>' +
      '<section class="card"><div class="card-h"><h2>Pratinjau 10 TGC berikutnya</h2></div><div id="tgcPrev"></div><div class="callout warn" style="margin-top:12px">' + ic('warning') + '<p>Perubahan siklus hanya memengaruhi bulan yang belum diterbitkan. Tekan Susun Otomatis lagi pada bulan draf.</p></div></section></div>';
  }
  function pratinjauTgc(k) {
    const f = k.querySelector('#fTgc'), box = k.querySelector('#tgcPrev'); if (!f || !box) return;
    const acuan = f.TGC_Tanggal_Acuan.value, iv = +f.TGC_Interval_Hari.value || 3, urut = f.TGC_Urutan_Sesi.value.toUpperCase().split(',').map((x) => x.trim()).filter((x) => /^[PSM]$/.test(x));
    if (!acuan || !urut.length) { box.innerHTML = UI.empty('help', 'Isi tanggal acuan dan urutan sesi'); return; }
    const i0 = Math.max(0, urut.indexOf(f.TGC_Sesi_Acuan.value)), out = [];
    for (let t = DJ.data.hariIni; out.length < 10 && t < T.add(DJ.data.hariIni, 400); t = T.add(t, 1)) {
      const d = T.diff(acuan, t); if (((d % iv) + iv) % iv) continue;
      const n = d / iv, s = urut[((i0 + n) % urut.length + urut.length) % urut.length]; out.push([t, s]);
    }
    box.innerHTML = '<div class="list">' + out.map((x) => '<div class="li"><div class="datebox' + (DJ.hariLibur(x[0]) ? ' libur' : '') + '"><b>' + (+x[0].slice(8)) + '</b><small>' + T.BULAN3[+x[0].slice(5, 7) - 1] + '</small></div>' + UI.chip('TGC-' + x[1]) + '<div class="grow"><b>' + esc(DJ.namaKeg('TGC-' + x[1])) + '</b><div class="small muted">' + esc(T.HARI[T.dow(x[0]) - 1] + (DJ.hariLibur(x[0]) ? ' · ' + DJ.hariLibur(x[0]).ket : '')) + '</div></div></div>').join('') + '</div>';
  }
  DJ.on('ms-tgc-simpan', async (el) => {
    const f = document.getElementById('fTgc'), nilai = {};
    ['TGC_Tanggal_Acuan', 'TGC_Sesi_Acuan', 'TGC_Interval_Hari', 'TGC_Urutan_Sesi', 'LPT_Aktif'].forEach((k) => { nilai[k] = f[k].value.trim().toUpperCase().replace(/\s/g, ''); });
    nilai.LPT_Aktif = f.LPT_Aktif.value;
    if (!(await UI.konfirmasi({ judul: 'Simpan siklus TGC?', pesan: 'Jadwal yang sudah terbit tidak berubah. Bulan draf perlu disusun ulang.', ok: 'Simpan' }))) return;
    try { await DJ.ubah(el, 'pengaturan.simpan', { nilai }, 'Siklus TGC tersimpan'); } catch (e) { }
  });

  function tabImpor() {
    const st = ui.master, d = st.impor, hasil = st.hasilImpor;
    const intro = '<section class="card"><div class="card-h"><div><h2>Impor Riwayat Jadwal (Apr–Nov 2026)</h2><p>Data jadwal lama dari Excel sudah dibaca dan disiapkan di dalam aplikasi. Pindai dulu untuk melihat apa yang akan masuk; tidak ada data yang ditulis sebelum Anda menekan Jalankan. Impor aman diulang.</p></div>' +
      '<button class="btn pri" data-act="ms-pindai">' + ic('document_scanner') + (d ? 'Pindai ulang' : 'Pindai data riwayat') + '</button></div>' +
      (!d ? UI.empty('upload_file', 'Belum dipindai', 'Tekan Pindai data riwayat untuk memulai.') :
        (d.sudahImpor ? '<div class="callout info" style="margin-bottom:14px">' + ic('info') + '<p>Riwayat sudah pernah diimpor. Menjalankan lagi hanya menambah yang belum ada (tidak membuat duplikat).</p></div>' : '') +
        '<div class="grid g2"><div><h3 style="font-size:15px;margin:0 0 8px">Ringkasan rencana</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Tambah</th><th>Ubah</th><th>Lewati</th></tr></thead><tbody>' +
        Object.keys(d.ringkasan).map((k) => { const r = d.ringkasan[k]; return '<tr><td><b>' + esc(k.replace(/_/g, ' ')) + '</b></td><td class="tnum">' + r.tambah + '</td><td class="tnum">' + r.ubah + '</td><td class="tnum muted">' + r.lewati + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div><h3 style="font-size:15px;margin:0 0 8px">Cocokkan dengan Lampiran A (hitung ulang Apr–Okt)</h3>' + perbandinganHtml(d.perbandingan) + '</div></div>' +
        '<h3 style="font-size:15px;margin:20px 0 8px">Perlu dicek ' + UI.badge(d.perluCek + ' baris', d.perluCek ? 'b-amber' : 'b-green') + '</h3>' +
        (d.perluCek ? '<p class="small muted" style="margin:0 0 10px">Baris ini tidak bisa dibaca pasti dari Excel (mis. tanggal P3K tertukar hari/bulan, TGC di luar siklus). Perbaiki tanggal/kegiatan bila perlu, lalu pilih OK atau Abaikan.</p><div class="list">' +
          d.staging.filter((s) => s.status === 'Perlu Cek').map((s) => '<div class="li" style="flex-wrap:wrap" data-stg="' + s.id + '"><div class="grow" style="min-width:220px"><b>' + esc(DJ.nama(s.d) !== '(tidak dikenal)' ? DJ.nama(s.d) : s.d) + '</b> · <span class="small">' + esc(s.sheet) + '</span><div class="small muted">' + esc(s.catatan) + '</div></div>' +
            '<input class="inp" type="date" value="' + esc(s.t) + '" data-f="t" style="width:auto"><select class="inp" data-f="k" style="width:auto">' + UI.opsi(['SB', 'SJ', 'TGC-P', 'TGC-S', 'TGC-M', 'P3K-B', 'P3K-L', 'CUBER'], s.k) + '</select>' +
            '<button class="btn sm" data-act="ms-putus" data-id="' + s.id + '" data-v="Diabaikan">Abaikan</button><button class="btn sm pri" data-act="ms-putus" data-id="' + s.id + '" data-v="OK">' + ic('check') + 'OK</button></div>').join('') + '</div>' +
          '<div class="row end" style="margin-top:10px"><button class="btn" data-act="ms-putus-semua">' + ic('done_all') + 'Terima semua apa adanya</button></div>'
          : '<div class="callout">' + ic('check_circle') + '<p>Semua baris sudah diputuskan.</p></div>') +
        '<details style="margin-top:16px"><summary class="small" style="cursor:pointer;font-weight:600">Lihat semua ' + d.staging.length + ' baris staging</summary><div class="tbl-wrap scroll-y" style="margin-top:8px"><table class="tbl"><thead><tr><th>Tanggal</th><th>Dokter</th><th>Kode</th><th>Sumber</th><th>Status</th></tr></thead><tbody>' +
        d.staging.map((s) => '<tr><td class="tnum">' + esc(s.t) + '</td><td>' + esc(DJ.idx.user[s.d] ? DJ.nama(s.d) : s.d) + '</td><td>' + UI.chip(s.k) + '</td><td class="small">' + esc(s.sheet) + '</td><td>' + UI.statusBadge(s.status) + '</td></tr>').join('') + '</tbody></table></div></details>' +
        '<div class="row end" style="margin-top:16px"><button class="btn pri" data-act="ms-jalankan"' + (d.perluCek ? ' disabled title="Putuskan baris Perlu Cek dulu"' : '') + '>' + ic('play_arrow') + 'Jalankan impor</button></div>') +
      (hasil ? '<div class="callout" style="margin-top:16px">' + ic('task_alt') + '<p><b>Impor selesai.</b> ' + Object.keys(hasil.hasil).map((k) => esc(k.replace(/_/g, ' ')) + ': +' + hasil.hasil[k].tambah + (hasil.hasil[k].ubah ? ' / ~' + hasil.hasil[k].ubah : '')).join(' · ') + '. ' + (hasil.perbandingan.cocok ? 'Hasil hitung cocok dengan Lampiran A.' : 'Ada selisih dengan Lampiran A — periksa tabel.') + '</p></div>' : '') + '</section>';
    const lama = st.lama;
    const dariSs = '<section class="card" style="margin-top:20px"><div class="card-h"><div><h2>Salin dari Spreadsheet Aplikasi Lama</h2><p>Untuk upgrade versi: data dibaca berdasarkan nama kolom dari spreadsheet database lama (milik akun Google yang sama). Spreadsheet lama tidak diubah.</p></div></div>' +
      '<div class="row"><input class="inp" id="ssLama" style="flex:1;min-width:220px" placeholder="Tempel URL atau ID spreadsheet lama" value="' + esc(lama ? lama.sumberInput : '') + '"><button class="btn" data-act="ms-lama" data-dry="1">' + ic('document_scanner') + 'Pindai</button><button class="btn pri" data-act="ms-lama" data-dry="0"' + (lama && lama.dryRun ? '' : ' disabled') + '>' + ic('play_arrow') + 'Salin</button></div>' +
      (lama ? '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Sheet (' + esc(lama.sumber) + ')</th><th>Tambah</th><th>Ubah</th><th>Lewati</th></tr></thead><tbody>' + Object.keys(lama.hasil).map((k) => { const r = lama.hasil[k]; return typeof r === 'string' ? '<tr><td>' + esc(k) + '</td><td colspan="3" class="muted small">' + esc(r) + '</td></tr>' : '<tr><td><b>' + esc(k) + '</b></td><td class="tnum">' + r.tambah + '</td><td class="tnum">' + r.ubah + '</td><td class="tnum muted">' + r.lewati + '</td></tr>'; }).join('') + '</tbody></table></div><p class="small muted">' + (lama.dryRun ? 'Pratinjau — belum ada yang ditulis.' : 'Selesai disalin.') + '</p>' : '') + '</section>';
    return intro + dariSs;
  }
  function perbandinganHtml(p) {
    if (!p || !p.tabel || !p.tabel.length) return '<p class="small muted">Tidak ada data pembanding.</p>';
    const g = p.tabel[0].kolom.map((c) => c.g);
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dokter</th>' + g.map((x) => '<th>' + esc(DJ.labelKel(x)) + '</th>').join('') + '</tr></thead><tbody>' +
      p.tabel.map((r) => '<tr><td><b>' + esc(r.nama) + '</b></td>' + r.kolom.map((c) => '<td class="tnum" style="color:' + (c.cocok ? '#166534' : '#B42318') + ';font-weight:600" title="Lampiran A: ' + c.harapan + '">' + c.hasil + (c.cocok ? '' : ' ≠ ' + c.harapan) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div><p class="small" style="margin:6px 0 0;color:' + (p.cocok ? '#166534' : '#B42318') + '">' + (p.cocok ? '✓ Semua angka sama dengan hitung ulang di PRD.' : 'Ada perbedaan (bergantung keputusan baris Perlu Cek).') + '</p>';
  }
  const pindai = async () => { ui.master.impor = await DJ.api('migrasi.pindai', {}, { timeout: 90000 }); };
  DJ.on('ms-pindai', (el) => UI.sibuk(el, async () => { try { ui.master.hasilImpor = null; await pindai(); DJ.render(); } catch (e) { UI.galat(e); } }));
  DJ.on('ms-putus', (el) => UI.sibuk(el, async () => {
    const row = el.closest('[data-stg]'), p = { id: el.dataset.id, status: el.dataset.v };
    if (p.status === 'OK') { p.tanggal = row.querySelector('[data-f=t]').value; p.kode = row.querySelector('[data-f=k]').value; }
    try { await DJ.api('migrasi.putuskan', p); await pindai(); DJ.render(); } catch (e) { UI.galat(e); }
  }));
  DJ.on('ms-putus-semua', async (el) => {
    if (!(await UI.konfirmasi({ judul: 'Terima semua baris?', pesan: 'Semua baris Perlu Cek dipakai dengan tanggal & kegiatan seperti terbaca sekarang.', ok: 'Terima semua' }))) return;
    await UI.sibuk(el, async () => { try { await DJ.api('migrasi.putuskan', { semua: true, status: 'OK' }); await pindai(); DJ.render(); } catch (e) { UI.galat(e); } });
  });
  DJ.on('ms-jalankan', async (el) => {
    if (!(await UI.konfirmasi({ judul: 'Jalankan impor?', pesan: 'Dokter, saldo awal, hari libur, berhalangan, periode, dan riwayat jadwal Apr–Nov 2026 akan ditulis ke database. Aman diulang.', ok: 'Jalankan' }))) return;
    await UI.sibuk(el, async () => {
      try { ui.master.hasilImpor = await DJ.api('migrasi.jalankan', {}, { timeout: 180000 }); await pindai().catch(() => { }); await DJ.segarkan(true).catch(() => { }); ui.master.pengguna = null; DJ.render(); UI.toast('Impor selesai'); }
      catch (e) { UI.galat(e); }
    });
  });
  DJ.on('ms-lama', async (el) => {
    const sumber = document.getElementById('ssLama').value.trim(), dry = el.dataset.dry === '1';
    if (!sumber) return UI.toast('Tempel URL/ID spreadsheet lama', 'warn');
    if (!dry && !(await UI.konfirmasi({ judul: 'Salin data dari spreadsheet lama?', pesan: 'Baris baru ditambahkan dan kolom yang boleh diperbarui akan diperbarui. Spreadsheet lama tidak disentuh.', ok: 'Salin' }))) return;
    await UI.sibuk(el, async () => {
      try { const r = await DJ.api('migrasi.dariSpreadsheet', { sumber, dryRun: dry }, { timeout: 180000 }); r.sumberInput = sumber; ui.master.lama = r; if (!dry) { await DJ.segarkan(true).catch(() => { }); ui.master.pengguna = null; } DJ.render(); }
      catch (e) { UI.galat(e); }
    });
  });

  function tabLog() {
    const st = ui.master;
    if (!st.log) { DJ.api('log.list', { halaman: 1, cari: st.logCari }).then((d) => { st.log = d.rows; st.logTotal = d.total; st.logHal = 1; DJ.render(); }).catch(UI.galat); return '<section class="card">' + UI.sk(8) + '</section>'; }
    return '<section class="card"><div class="card-h"><div><h2>Log Aktivitas</h2><p>Jejak semua perubahan penting (' + st.logTotal + ' catatan).</p></div><div class="row"><input class="inp" id="logCari" placeholder="Cari aksi, nama, ID…" value="' + esc(st.logCari) + '" style="width:220px"><button class="btn" data-act="ms-log-cari">' + ic('search') + 'Cari</button></div></div>' +
      (st.log.length ? '<div class="list">' + st.log.map((r) => '<details class="li" style="display:block"><summary style="cursor:pointer;display:flex;gap:12px;align-items:center;list-style:none">' + UI.av(r.ID_User, 'sm') + '<div class="grow"><b>' + esc(r.Aksi.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())) + '</b> <span class="small muted">' + esc(r.Entitas + (r.ID_Entitas ? ' · ' + r.ID_Entitas : '')) + '</span><div class="small muted">' + esc(DJ.nama(r.ID_User) + ' · ' + String(r.Waktu).replace('T', ' ').slice(0, 16)) + '</div></div>' + ic('expand_more', 'muted') + '</summary>' +
        (r.Data_Lama ? '<div class="small muted" style="margin-top:8px">Sebelum</div><pre class="json">' + esc(r.Data_Lama) + '</pre>' : '') + (r.Data_Baru ? '<div class="small muted" style="margin-top:8px">Sesudah</div><pre class="json">' + esc(r.Data_Baru) + '</pre>' : '') + '</details>').join('') + '</div>' +
        (st.log.length < st.logTotal ? '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-act="ms-log-lagi">Muat lagi</button></div>' : '') : UI.empty('history', 'Tidak ada catatan')) + '</section>';
  }
  DJ.on('ms-log-cari', () => { ui.master.logCari = document.getElementById('logCari').value.trim(); ui.master.log = null; DJ.render(); });
  DJ.on('ms-log-lagi', (el) => UI.sibuk(el, async () => { const st = ui.master; try { const d = await DJ.api('log.list', { halaman: st.logHal + 1, cari: st.logCari }); st.logHal++; st.log = st.log.concat(d.rows); DJ.render(); } catch (e) { UI.galat(e); } }));

  H.master = {
    render() {
      const st = ui.master;
      if (!DJ.isAdmin() && st.tab !== 'log') st.tab = 'log';
      const tabs = DJ.isAdmin() ? [['dokter', 'Dokter & Pengguna', 'group'], ['kegiatan', 'Jenis Kegiatan', 'category'], ['libur', 'Hari Libur', 'event_busy'], ['tgc', 'Siklus TGC', 'autorenew'], ['impor', 'Impor Data', 'upload_file'], ['log', 'Log', 'history']] : [['log', 'Log', 'history']];
      const isi = { dokter: tabDokter, kegiatan: tabKegiatan, libur: tabLibur, tgc: tabTgc, impor: tabImpor, log: tabLog }[st.tab]();
      return '<div class="page-h"><div><h1>Data Master</h1><p>Dokter, jenis kegiatan, hari libur, siklus TGC, dan impor data lama.</p></div></div>' + tab('ms-tab', tabs, st.tab) + isi;
    },
    setelah(k) {
      if (ui.master.tab === 'tgc') { pratinjauTgc(k); const f = k.querySelector('#fTgc'); f && f.addEventListener('input', () => pratinjauTgc(k)); }
      const c = k.querySelector('#logCari'); if (c) c.addEventListener('keydown', (e) => { if (e.key === 'Enter') DJ.aksi['ms-log-cari'](); });
    }
  };
  DJ.on('ms-tab', (el) => { ui.master.tab = el.dataset.v; if (el.dataset.v === 'log') ui.master.log = null; DJ.render(); });

  /* ======================================================================
   * PENGATURAN (Admin)
   * ==================================================================== */
  ui.atur = { tab: 'umum', data: null, status: null };
  const muatAtur = async () => { ui.atur.data = await DJ.api('pengaturan.get', {}); };
  function fld(k, label, jenis, opsi, bantu) {
    const d = ui.atur.data, v = d.nilai[k] != null ? d.nilai[k] : '', ket = bantu || d.keterangan[k] || '';
    let inp;
    if (jenis === 'yatidak') inp = '<select class="inp" data-set="' + k + '">' + UI.opsi([['Ya', 'Ya'], ['Tidak', 'Tidak']], v) + '</select>';
    else if (jenis === 'select') inp = '<select class="inp" data-set="' + k + '">' + UI.opsi(opsi, v) + '</select>';
    else if (jenis === 'area') inp = '<textarea class="inp" data-set="' + k + '" maxlength="1000" rows="3">' + esc(v) + '</textarea>';
    else inp = '<input class="inp" data-set="' + k + '" type="' + (jenis || 'text') + '" value="' + esc(v) + '"' + (jenis === 'number' ? ' min="0"' : '') + '>';
    return '<div class="field' + (jenis === 'area' ? ' full' : '') + '"><label>' + esc(label) + '</label>' + inp + (ket ? '<small>' + esc(ket) + '</small>' : '') + '</div>';
  }
  const tombolSimpan = '<div class="full row end"><button class="btn pri" data-act="atur-simpan">' + ic('save') + 'Simpan</button></div>';
  function tabUmum() {
    return '<section class="card"><div class="card-h"><h2>Identitas & Kop Dokumen</h2></div><div class="form-grid">' + fld('Nama_Puskesmas', 'Nama Puskesmas') + fld('Alamat_Puskesmas', 'Alamat') + fld('Kepala_Nama', 'Nama Kepala Puskesmas') + fld('Kepala_NIP', 'NIP Kepala') +
      fld('URL_Frontend', 'Alamat aplikasi (GitHub Pages)', 'url', null, 'Contoh: https://username.github.io/dokter-jaga/ — dipakai untuk tautan di email/WA dan halaman verifikasi.') + tombolSimpan + '</div></section>';
  }
  function tabJadwal() {
    return '<section class="card"><div class="card-h"><h2>Tukar Jaga & Penerbitan</h2></div><div class="form-grid">' +
      fld('Penyetuju_Akhir', 'Penyetuju akhir tukar jaga', 'select', [['KEPALA', 'Kepala Puskesmas'], ['ADMIN', 'Admin']]) + fld('Batas_Ajukan_Tukar_Hari', 'Batas pengajuan tukar (H-n)', 'number') +
      fld('Tanggal_Target_Terbit', 'Target terbit jadwal bulan depan (tanggal)', 'number') + fld('Jam_Pengingat', 'Jam kirim pengingat H-1 (0–23)', 'number', null, 'Pemicu harian dipasang ulang otomatis saat disimpan.') + tombolSimpan + '</div></section>';
  }
  function tabNotif() {
    const d = ui.atur.data;
    return '<div class="grid g2"><section class="card"><div class="card-h"><h2>Saluran</h2></div><div class="form-grid">' + fld('Notif_Email', 'Email', 'yatidak') + fld('Notif_WA', 'WhatsApp', 'yatidak') + fld('Sinkron_Kalender', 'Google Calendar', 'yatidak') + tombolSimpan + '</div></section>' +
      '<section class="card"><div class="card-h"><div><h2>Gateway WhatsApp</h2><p>Token disimpan di Script Properties dan tidak pernah ditampilkan kembali.</p></div></div><div class="form-grid">' +
      '<div class="field"><label>Penyedia</label><select class="inp" id="waProv">' + UI.opsi([['', '— belum dipilih —'], ['fonnte', 'Fonnte']], d.rahasia.WA_PROVIDER) + '</select></div>' +
      '<div class="field"><label>Token</label><input class="inp" id="waTok" type="password" autocomplete="off" placeholder="' + esc(d.rahasia.WA_TOKEN || 'Tempel token dari dashboard Fonnte') + '"></div>' +
      '<div class="full row end"><button class="btn pri" data-act="atur-wa">' + ic('key') + 'Simpan gateway</button></div>' +
      '<div class="field full"><label>Uji kirim</label><div class="row"><input class="inp" id="ujiHp" inputmode="tel" placeholder="08xx (WA tujuan uji)" style="flex:1;min-width:160px"><button class="btn" data-act="atur-uji" data-j="wa">' + ic('chat') + 'Uji WA</button><button class="btn" data-act="atur-uji" data-j="email">' + ic('mail') + 'Uji email ke saya</button></div></div></div></section></div>' +
      '<section class="card" style="margin-top:20px"><div class="card-h"><div><h2>Template Pesan WA</h2><p>Penanda yang tersedia: {{nama}}, {{tanggal}}, {{kegiatan}}, {{lokasi}}, {{bulan}}, {{jumlah}}, {{pesan}}, {{tautan}}, {{puskesmas}}.</p></div></div><div class="form-grid">' +
      fld('WA_Tpl_Pengingat', 'Pengingat H-1', 'area') + fld('WA_Tpl_Terbit', 'Jadwal terbit', 'area') + fld('WA_Tpl_Tukar', 'Tukar jaga', 'area') + tombolSimpan + '</div></section>';
  }
  function tabSistem() {
    const s = ui.atur.status;
    if (!s) { DJ.api('sistem.status', {}).then((d) => { ui.atur.status = d; DJ.render(); }).catch(UI.galat); return '<section class="card">' + UI.sk(8) + '</section>'; }
    const ok = (b, ya, tidak) => UI.badge(b ? ya || 'Aktif' : tidak || 'Belum', b ? 'b-green' : 'b-amber');
    return '<div class="grid g2"><section class="card"><div class="card-h"><h2>Status Sistem</h2><button class="btn sm" data-act="atur-status">' + ic('refresh') + 'Muat ulang</button></div><div class="kv">' +
      '<span>Versi backend</span><b>' + esc(s.versi) + '</b><span>Pemicu antrean (10 menit)</span><div>' + ok(s.pemicu.antrean) + '</div><span>Pemicu harian</span><div>' + ok(s.pemicu.harian) + '</div>' +
      '<span>Sisa kuota email hari ini</span><b class="tnum">' + s.kuotaEmail + '</b><span>WhatsApp</span><div>' + ok(s.wa.aktif, 'Siap (' + esc(s.wa.provider) + ')', s.wa.token ? 'Token ada, Notif WA mati' : 'Belum diatur') + '</div><span>Google Calendar</span><div>' + ok(s.kalender, 'Terhubung') + '</div>' +
      '<span>Database</span><div><a href="' + esc(s.database) + '" target="_blank" rel="noopener">Buka spreadsheet ' + ic('open_in_new') + '</a></div><span>Folder Drive</span><div><a href="' + esc(s.folder) + '" target="_blank" rel="noopener">Buka folder ' + ic('open_in_new') + '</a></div>' +
      '<span>URL server</span><div class="small" style="font-family:ui-monospace,monospace">' + esc(s.urlServer || '-') + '</div></div></section>' +
      '<section class="card"><div class="card-h"><h2>Antrean Notifikasi & Kalender</h2><button class="btn sm pri" data-act="atur-proses">' + ic('play_arrow') + 'Proses sekarang</button></div><div class="row" style="gap:20px;margin-bottom:12px">' +
      [['Menunggu', s.antrean.PENDING || 0, '#B45309'], ['Terkirim', s.antrean.SENT || 0, '#166534'], ['Gagal', s.antrean.FAILED || 0, '#B42318']].map((x) => '<div><div class="tnum" style="font-size:26px;font-weight:700;color:' + x[2] + '">' + x[1] + '</div><div class="small muted">' + x[0] + '</div></div>').join('') + '</div>' +
      (s.gagal.length ? '<div class="list">' + s.gagal.slice().reverse().map((g) => '<div class="li"><span class="badge b-red">' + esc(g.jenis) + '</span><div class="grow"><b class="small">' + esc(g.tujuan) + '</b><div class="small muted">' + esc(g.galat) + '</div></div><span class="small muted">' + esc(String(g.waktu || '').slice(0, 16).replace('T', ' ')) + '</span></div>').join('') + '</div>' : '<p class="small muted">Tidak ada yang gagal.</p>') + '</section></div>';
  }
  H.pengaturan = {
    render() {
      const st = ui.atur;
      if (!st.data) { muatAtur().then(DJ.render).catch(UI.galat); return '<div class="page-h"><div><h1>Pengaturan</h1></div></div><section class="card">' + UI.sk(8) + '</section>'; }
      const isi = { umum: tabUmum, jadwal: tabJadwal, notif: tabNotif, sistem: tabSistem }[st.tab]();
      return '<div class="page-h"><div><h1>Pengaturan</h1><p>Aturan tukar jaga, notifikasi, integrasi, dan kesehatan sistem.</p></div></div>' +
        tab('atur-tab', [['umum', 'Umum', 'apartment'], ['jadwal', 'Tukar & Jadwal', 'swap_horiz'], ['notif', 'Notifikasi & Kalender', 'notifications'], ['sistem', 'Status Sistem', 'monitor_heart']], st.tab) + isi;
    }
  };
  DJ.on('atur-tab', (el) => { ui.atur.tab = el.dataset.v; if (el.dataset.v === 'sistem') ui.atur.status = null; DJ.render(); });
  DJ.on('atur-simpan', (el) => UI.sibuk(el, async () => {
    const nilai = {}; el.closest('.card').querySelectorAll('[data-set]').forEach((x) => { nilai[x.dataset.set] = x.value.trim(); });
    try { await DJ.api('pengaturan.simpan', { nilai }); await Promise.all([muatAtur(), DJ.segarkan().catch(() => { })]); DJ.render(); UI.toast('Pengaturan tersimpan'); } catch (e) { UI.galat(e); }
  }));
  DJ.on('atur-wa', (el) => UI.sibuk(el, async () => {
    const prov = document.getElementById('waProv').value, tok = document.getElementById('waTok').value.trim();
    try {
      await DJ.api('pengaturan.rahasia', { kunci: 'WA_PROVIDER', nilai: prov });
      if (tok) await DJ.api('pengaturan.rahasia', { kunci: 'WA_TOKEN', nilai: tok });
      await muatAtur(); DJ.render(); UI.toast(tok ? 'Gateway & token tersimpan' : 'Penyedia tersimpan');
    } catch (e) { UI.galat(e); }
  }));
  DJ.on('atur-uji', (el) => UI.sibuk(el, async () => {
    const jenis = el.dataset.j, noHp = (document.getElementById('ujiHp') || {}).value || '';
    if (jenis === 'wa' && !noHp.trim()) return UI.toast('Isi nomor WA tujuan uji', 'warn');
    try { const r = await DJ.api('sistem.ujiNotif', { jenis, noHp }, { timeout: 60000 }); UI.toast('Pesan uji terkirim ke ' + r.ke); } catch (e) { UI.galat(e); }
  }));
  DJ.on('atur-status', () => { ui.atur.status = null; DJ.render(); });
  DJ.on('atur-proses', (el) => UI.sibuk(el, async () => {
    try { const r = await DJ.api('sistem.prosesAntrean', {}, { timeout: 60000 }); ui.atur.status = null; DJ.render(); UI.toast('Diproses: ' + (r.terkirim || 0) + ' berhasil, ' + (r.gagal || 0) + ' gagal' + (r.sisa ? ', ' + r.sisa + ' tersisa' : '')); } catch (e) { UI.galat(e); }
  }));

  /* ======================================================================
   * PROFIL
   * ==================================================================== */
  H.profil = {
    render() {
      const u = DJ.sesi.user, peran = (u.peran || []).map((p) => UI.badge(p === 'DOKTER' ? 'Dokter ' + (u.status || '') : p === 'KEPALA' ? 'Kepala Puskesmas' : 'Admin', p === 'ADMIN' ? 'b-purple' : p === 'KEPALA' ? 'b-blue' : 'b-green')).join(' ');
      const bebanSaya = DJ.isDokter() ? (DJ.data.beban.dokter.find((d) => d.id === u.id) || null) : null;
      return '<div class="page-h"><div><h1>Profil</h1><p>Akun, keamanan, dan perangkat.</p></div></div><div class="grid g-7-5"><section class="card"><div class="row" style="gap:16px;margin-bottom:18px">' + UI.av(u, 'lg') + '<div><h2 style="font-size:20px">' + esc(u.nama) + '</h2><div class="row" style="gap:6px;margin-top:6px">' + peran + '</div></div></div>' +
        '<div class="kv"><span>Email</span><b>' + esc(u.email || '-') + '</b><span>No. HP</span><b>' + esc(u.noHp || '-') + '</b><span>NIP</span><b>' + esc(u.nip || '-') + '</b><span>Notifikasi WA</span><b>' + (u.notifWa ? 'Aktif' : 'Tidak') + '</b>' +
        (bebanSaya ? '<span>Total poin beban</span><b class="tnum">' + DJ.num(bebanSaya.poin) + '</b>' : '') + '</div><p class="small muted" style="margin:16px 0 0">Perubahan data diri dilakukan oleh Admin.</p></section>' +
        '<section class="card"><div class="card-h"><h2>Keamanan & Perangkat</h2></div><div class="list">' +
        '<div class="li">' + ic('password', 'muted') + '<div class="grow"><b>Ganti PIN</b><div class="small muted">PIN 6 angka untuk masuk</div></div><button class="btn sm" data-act="pf-pin">Ganti</button></div>' +
        '<div class="li">' + ic('devices', 'muted') + '<div class="grow"><b>Keluar dari semua perangkat</b><div class="small muted">Bila HP hilang atau dipinjam</div></div><button class="btn sm danger-o" data-act="pf-keluar-semua">Keluar semua</button></div>' +
        (DJ.bisaPasang() ? '<div class="li">' + ic('install_mobile', 'muted') + '<div class="grow"><b>Pasang aplikasi</b><div class="small muted">Buka langsung dari layar utama</div></div><button class="btn sm pri" data-act="pf-pasang">Pasang</button></div>' : '') +
        '<div class="li">' + ic('sync', 'muted') + '<div class="grow"><b>Muat ulang data</b><div class="small muted">Ambil ulang semua data dari server</div></div><button class="btn sm" data-act="pf-segar">Muat ulang</button></div></div>' +
        '<p class="small muted" style="margin:14px 0 0">Versi data ' + esc(String(DJ.data.ver || '-')) + ' · ' + esc(DJ.set('Nama_Puskesmas')) + '</p></section></div>';
    }
  };
  DJ.on('pf-pin', () => DJ.gantiPin(false));
  DJ.on('pf-pasang', () => { DJ.pasangApp(); setTimeout(DJ.render, 500); });
  DJ.on('pf-segar', (el) => UI.sibuk(el, async () => { try { await DJ.segarkan(true); DJ.render(); UI.toast('Data diperbarui'); } catch (e) { UI.galat(e); } }));
  DJ.on('pf-keluar-semua', async (el) => {
    if (!(await UI.konfirmasi({ judul: 'Keluar dari semua perangkat?', pesan: 'Semua perangkat (termasuk yang ini) harus masuk ulang dengan PIN.', ok: 'Keluar semua', bahaya: true }))) return;
    await UI.sibuk(el, async () => { try { await DJ.api('auth.keluarSemua', {}); DJ.simpanSesi(null); DJ.keLogin('Anda sudah keluar dari semua perangkat.'); } catch (e) { UI.galat(e); } });
  });
})(window.DJ);
