/* app.js — kerangka aplikasi: router hash, sidebar/topbar/menu bawah, login, ganti PIN, sinkron latar, PWA. */
'use strict';
(function (DJ) {
  const UI = DJ.UI, esc = DJ.esc, ic = UI.ic;

  const MENU = [
    ['beranda', 'Beranda', 'home', () => true],
    ['kalender', 'Kalender Jadwal', 'calendar_month', () => true],
    ['jadwal-saya', 'Jadwal Saya', 'event_available', () => DJ.isDokter()],
    ['tukar', 'Tukar Jaga', 'swap_horiz', () => true],
    ['agenda', 'Agenda Luar Gedung', 'directions_car', () => true],
    ['beban', 'Transparansi Beban', 'bar_chart', () => true],
    ['berhalangan', 'Berhalangan', 'event_busy', () => DJ.isDokter() || DJ.isPengelola()],
    ['kelola', 'Kelola Jadwal', 'edit_calendar', () => DJ.isPengelola()],
    ['laporan', 'Laporan', 'description', () => true],
    ['master', 'Data Master', 'database', () => DJ.isPengelola()],
    ['pengaturan', 'Pengaturan', 'settings', () => DJ.isAdmin()]
  ];
  const BAWAH = [['beranda', 'Beranda', 'home'], ['kalender', 'Kalender', 'calendar_month'], ['tukar', 'Tukar', 'swap_horiz'], ['beban', 'Beban', 'bar_chart']];
  const root = () => document.getElementById('app');

  /* ---------------- aksi global (delegasi) ---------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.closest('[disabled]')) return;
    const fn = DJ.aksi[el.dataset.act];
    if (fn) { e.preventDefault(); try { const r = fn(el, e); if (r && r.catch) r.catch(UI.galat); } catch (err) { UI.galat(err); } }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-chg]');
    if (el && DJ.aksi[el.dataset.chg]) { try { const r = DJ.aksi[el.dataset.chg](el, e); if (r && r.catch) r.catch(UI.galat); } catch (err) { UI.galat(err); } }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
  });

  /** Jalankan aksi tulis ke server, lalu segarkan data & tampilan. */
  DJ.ubah = (btn, action, payload, pesanOk) => UI.sibuk(btn, async () => {
    try {
      const r = await DJ.api(action, payload);
      try { await DJ.segarkan(); } catch (e) { /* tampilkan data lama */ }
      DJ.render();
      if (pesanOk) UI.toast(typeof pesanOk === 'function' ? pesanOk(r) : pesanOk);
      return r;
    } catch (e) { UI.galat(e); throw e; }
  });

  /* ---------------- hitungan lencana ---------------- */
  DJ.penyetujuSaya = () => (DJ.set('Penyetuju_Akhir') === 'ADMIN' ? DJ.isAdmin() : DJ.isKepala());
  DJ.tugasTukarSaya = () => {
    if (!DJ.data) return [];
    const me = DJ.uid();
    return DJ.data.tukar.filter((t) => (t.status === 'Menunggu Rekan' && t.rekan === me) || (t.status === 'Menunggu Persetujuan' && DJ.penyetujuSaya() && t.pemohon !== me && t.rekan !== me));
  };
  DJ.perluPengganti = () => (DJ.data ? DJ.data.jadwal.filter((r) => r.st === 'Perlu Pengganti' || (r.st === 'Terbit' && !r.d)) : []);
  function notifikasi() {
    if (!DJ.data) return [];
    const out = [], me = DJ.uid(), hari = DJ.data.hariIni;
    DJ.tugasTukarSaya().forEach((t) => {
      const asal = DJ.idx.jadwal[t.asal];
      out.push({ ikon: 'swap_horiz', teks: (t.status === 'Menunggu Rekan' ? DJ.nama(t.pemohon) + ' meminta Anda menggantikan/bertukar' : 'Tukar ' + DJ.nama(t.pemohon) + ' → ' + DJ.nama(t.rekan) + ' menunggu persetujuan') + (asal ? ' · ' + DJ.namaKeg(asal.k) + ' ' + DJ.T.fmtPendek(asal.t) : ''), ke: 'tukar', waktu: t.tgl });
    });
    DJ.data.tukar.filter((t) => t.pemohon === me && /Disetujui|Ditolak/.test(t.status) && t.tglPutus && DJ.T.diff(t.tglPutus.slice(0, 10), hari) <= 7)
      .forEach((t) => out.push({ ikon: t.status === 'Disetujui' ? 'check_circle' : 'cancel', teks: 'Permintaan tukar Anda ' + t.status.toLowerCase(), ke: 'tukar', waktu: t.tglPutus }));
    if (DJ.isAdmin()) {
      const pp = DJ.perluPengganti().filter((r) => r.t >= hari);
      if (pp.length) out.push({ ikon: 'person_alert', teks: pp.length + ' jadwal perlu pengganti', ke: 'kelola' });
      const depan = DJ.T.shift(hari.slice(0, 7), 1);
      if (+hari.slice(8) >= 15 && DJ.statusPeriode(depan) === 'Draf') out.push({ ikon: 'edit_calendar', teks: 'Jadwal ' + DJ.T.fmtPer(depan) + ' belum terbit (target tgl ' + (DJ.set('Tanggal_Target_Terbit') || 25) + ')', ke: 'kelola' });
    }
    const besok = DJ.T.add(hari, 1);
    DJ.data.jadwal.filter((r) => r.d === me && r.t === besok && r.st === 'Terbit').forEach((r) => out.push({ ikon: 'alarm', teks: 'Besok Anda bertugas: ' + DJ.namaKeg(r.k) + (DJ.jam(r.k) ? ' · ' + DJ.jam(r.k) : ''), ke: 'jadwal-saya' }));
    return out;
  }

  /* ---------------- kerangka ---------------- */
  function rute() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const ada = MENU.find((m) => m[0] === h) || (h === 'profil' ? ['profil', 'Profil', 'person', () => true] : null);
    return ada && ada[3]() ? ada[0] : 'beranda';
  }
  DJ.ke = (nama) => { if (location.hash !== '#/' + nama) location.hash = '#/' + nama; else DJ.render(); };

  function kerangka() {
    const u = DJ.sesi.user, peran = u.peran.indexOf('ADMIN') > -1 ? 'Admin' : u.peran.indexOf('KEPALA') > -1 ? 'Kepala Puskesmas' : u.status === 'Pengganti' ? 'Dokter Pengganti' : 'Dokter Tetap';
    root().innerHTML =
      '<div class="app"><aside class="sidebar" aria-label="Menu utama"><div class="brand"><div class="brand-logo">' + ic('medical_services') + '</div><div><b>Dokter Jaga</b><small>' + esc(DJ.set('Nama_Puskesmas') || 'Puskesmas Lontar') + '</small></div></div>' +
      '<nav class="nav" id="nav"></nav><div class="side-foot"><button class="me" data-act="menu-akun">' + UI.av(DJ.sesi.user, 'sm solid') + '<div><b>' + esc(u.nama) + '</b><small>' + esc(peran) + '</small></div></button>' +
      '<button class="nav-out" data-act="keluar">' + ic('logout') + '<span class="lbl">Keluar</span></button></div></aside>' +
      '<div class="main"><header class="topbar"><div class="ttl" id="ttl"></div><span class="sync" id="sync" title="Status sinkron"><i></i><span>Tersinkron</span></span>' +
      '<button class="ico-btn" data-act="notif" aria-label="Notifikasi" id="bell">' + ic('notifications') + '</button><span class="role-chip">' + esc(peran) + '</span>' +
      '<button class="ico-btn show-m" data-act="menu-akun" aria-label="Akun">' + UI.av(DJ.sesi.user, 'sm solid') + '</button></header>' +
      '<main class="content" id="konten" tabindex="-1"></main></div></div>' +
      '<nav class="bottomnav" id="bnav" aria-label="Menu bawah"></nav>';
  }

  function isiNav(aktif) {
    const n = DJ.tugasTukarSaya().length;
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.innerHTML = MENU.filter((m) => m[3]()).map((m) => '<a href="#/' + m[0] + '" class="' + (m[0] === aktif ? 'on' : '') + '" title="' + esc(m[1]) + '">' + ic(m[2]) + '<span class="lbl">' + esc(m[1]) + '</span>' + (m[0] === 'tukar' && n ? '<span class="cnt">' + n + '</span>' : '') + '</a>').join('');
    const lain = !BAWAH.some((b) => b[0] === aktif);
    document.getElementById('bnav').innerHTML = BAWAH.map((b) => '<a href="#/' + b[0] + '" class="' + (b[0] === aktif ? 'on' : '') + '">' + ic(b[2]) + '<span>' + b[1] + '</span>' + (b[0] === 'tukar' && n ? '<span class="cnt">' + n + '</span>' : '') + '</a>').join('') +
      '<button data-act="lainnya" class="' + (lain ? 'on' : '') + '">' + ic('more_horiz') + '<span>Lainnya</span></button>';
    const bell = document.getElementById('bell');
    if (bell) { const ada = notifikasi().length; bell.innerHTML = ic('notifications') + (ada ? '<span class="dot"></span>' : ''); }
  }

  let ruteAktif = '';
  DJ.render = function () {
    if (!DJ.sesi) return;
    if (!document.getElementById('konten')) kerangka();
    const r = rute(), pg = DJ.halaman[r];
    const ganti = r !== ruteAktif;
    ruteAktif = r;
    isiNav(r);
    const k = document.getElementById('konten');
    const mn = MENU.find((m) => m[0] === r);
    document.getElementById('ttl').innerHTML = esc(DJ.set('Nama_Puskesmas') || 'Puskesmas Lontar') + (mn && r !== 'beranda' ? ' <small>· ' + esc(mn[1]) + '</small>' : '');
    document.title = (mn ? mn[1] + ' — ' : '') + 'Dokter Jaga';
    if (!DJ.data) { k.innerHTML = '<div class="page-h"><div><div class="sk sk-line" style="width:240px;height:28px"></div><div class="sk sk-line" style="width:340px"></div></div></div><div class="grid g4">' + UI.sk(4, 'sk-kpi') + '</div><div style="height:20px"></div>' + UI.sk(1, 'sk-block'); return; }
    if (!pg) { k.innerHTML = UI.empty('construction', 'Halaman tidak ditemukan'); return; }
    const y = ganti ? 0 : window.scrollY;
    try { k.innerHTML = pg.render(); if (pg.setelah) pg.setelah(k); }
    catch (e) { console.error(e); k.innerHTML = UI.empty('error', 'Halaman gagal ditampilkan', String(e.message || e)); }
    if (ganti) { window.scrollTo(0, 0); try { k.focus({ preventScroll: true }); } catch (e) { } } else window.scrollTo(0, y);
  };
  window.addEventListener('hashchange', () => { UI.tutupSemua(); UI.$$('.menu-pop').forEach((m) => m.remove()); DJ.render(); });

  /* ---------------- menu akun, notifikasi, lainnya ---------------- */
  DJ.on('menu-akun', (el) => UI.menu(el, [
    { ikon: 'person', teks: 'Profil & ganti PIN', fn: () => DJ.ke('profil') },
    { ikon: 'sync', teks: 'Muat ulang data', fn: () => sinkron(true) },
    '-',
    { ikon: 'logout', teks: 'Keluar', fn: () => DJ.aksi.keluar() }
  ]));
  DJ.on('notif', (el) => {
    const list = notifikasi();
    const html = '<div style="padding:8px 10px 4px"><b>Notifikasi</b></div>' + (list.length ? list.map((n) => '<a href="#/' + n.ke + '">' + ic(n.ikon) + '<span style="flex:1">' + esc(n.teks) + (n.waktu ? '<br><small class="muted">' + esc(DJ.T.rel(n.waktu)) + '</small>' : '') + '</span></a>').join('') : '<div class="empty" style="padding:20px">' + ic('notifications_off') + '<span>Tidak ada notifikasi baru</span></div>');
    UI.menu(el, { html, cls: 'notif-pop' });
  });
  DJ.on('lainnya', (el) => {
    const items = MENU.filter((m) => m[3]() && !BAWAH.some((b) => b[0] === m[0])).map((m) => ({ ikon: m[2], teks: m[1], fn: () => DJ.ke(m[0]) }));
    items.push('-', { ikon: 'person', teks: 'Profil', fn: () => DJ.ke('profil') }, { ikon: 'logout', teks: 'Keluar', fn: () => DJ.aksi.keluar() });
    UI.menu(el, items);
  });
  DJ.on('keluar', async () => {
    if (!(await UI.konfirmasi({ judul: 'Keluar dari aplikasi?', pesan: 'Data salinan di perangkat ini akan dihapus.', ok: 'Keluar' }))) return;
    DJ.LS.del('dj_boot_' + DJ.uid()); DJ.simpanSesi(null); DJ.data = null; ruteAktif = '';
    location.hash = ''; tampilLogin();
  });

  /* ---------------- sinkron latar ---------------- */
  let tSinkron = null, terakhir = 0;
  async function sinkron(manual) {
    if (!DJ.sesi || document.hidden) return;
    if (UI.$('.drawer, .modal') && !manual) return;   // jangan ganggu saat pengguna sedang mengisi
    terakhir = Date.now();
    try {
      const ubah = await DJ.segarkan(manual === true);
      if (ubah) DJ.render();
      if (manual === true) UI.toast('Data terbaru sudah dimuat', 'info');
    } catch (e) { if (manual === true) UI.galat(e); }
  }
  DJ.sinkron = sinkron;
  function mulaiSinkron() {
    clearInterval(tSinkron);
    tSinkron = setInterval(() => sinkron(false), 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - terakhir > 20000) sinkron(false); });
    window.addEventListener('online', () => sinkron(false));
  }
  DJ.onSibuk((n) => {
    const s = document.getElementById('sync'); if (!s) return;
    s.classList.toggle('busy', n > 0);
    s.classList.toggle('off', navigator.onLine === false);
    s.querySelector('span').textContent = n > 0 ? 'Menyinkronkan…' : navigator.onLine === false ? 'Offline' : 'Tersinkron';
  });

  /* ---------------- login ---------------- */
  function tampilLogin(pesan) {
    const nama = (DJ.data && DJ.set('Nama_Puskesmas')) || 'Puskesmas Lontar';
    document.getElementById('bnav') && document.getElementById('bnav').remove();
    root().innerHTML = '<div class="login"><div class="login-box"><div class="login-art"><div><div class="row"><div class="brand-logo" style="width:48px;height:48px">' + ic('medical_services') + '</div><div><b style="font-size:17px">Dokter Jaga</b><div style="opacity:.8;font-size:13px">' + esc(nama) + '</div></div></div>' +
      '<h1>Jadwal jaga yang adil dan transparan</h1><p>Penyusunan otomatis, tukar jaga berjenjang, dan rekap beban yang sama untuk semua dokter.</p></div>' +
      '<svg class="art" viewBox="0 0 320 200" fill="none" aria-hidden="true" style="max-width:320px;color:#fff"><rect x="44" y="24" width="160" height="136" rx="14" fill="currentColor" fill-opacity=".12"/><rect x="44" y="24" width="160" height="34" rx="14" fill="currentColor" fill-opacity=".22"/>' +
      [76, 104, 132].map((y, i) => [64, 98, 132, 166].map((x, j) => '<rect x="' + x + '" y="' + y + '" width="' + (j === 3 ? 20 : 24) + '" height="18" rx="5" fill="currentColor" fill-opacity="' + ((i + j) % 3 === 1 ? '.7' : '.25') + '"/>').join('')).join('') +
      '<circle cx="246" cy="76" r="22" fill="currentColor" fill-opacity=".9"/><path d="M208 158c0-26.5 17-48 38-48s38 21.5 38 48v10h-76z" fill="currentColor" fill-opacity=".9"/><path d="M236 118v22a10 10 0 0 0 20 0" stroke="#155C3B" stroke-width="3"/></svg>' +
      '<div style="font-size:12px;opacity:.7">© ' + new Date().getFullYear() + ' ' + esc(nama) + '</div></div>' +
      '<form class="login-form" id="fLogin" autocomplete="on" novalidate><div><div class="eyebrow">Selamat datang</div><h2>Masuk</h2><p class="muted" style="margin:6px 0 0">Gunakan email dan PIN 6 digit dari Admin.</p></div>' +
      (!DJ.konfigOk() ? '<div class="callout bad">' + ic('error') + '<p><b>Konfigurasi belum lengkap.</b> Isi alamat server (GAS_URL) di berkas <code>js/config.js</code>, lalu unggah ulang.</p></div>' : '') +
      '<div class="callout bad" id="lgErr" hidden>' + ic('error') + '<p></p></div>' +
      '<div class="field"><label for="lgEmail">Email</label><input class="inp" id="lgEmail" type="email" autocomplete="username" inputmode="email" required placeholder="nama@email.com"></div>' +
      '<div class="field"><label>PIN</label><div class="pin-boxes" id="lgPin">' + Array.from({ length: 6 }, (_, i) => '<input class="inp" inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="' + (i ? 'off' : 'current-password') + '" aria-label="Digit PIN ' + (i + 1) + '">').join('') + '</div></div>' +
      '<button class="btn pri block" type="submit" id="lgBtn">' + ic('login') + 'Masuk</button>' +
      '<p class="muted small" style="margin:0;text-align:center">Lupa PIN? Hubungi Admin untuk mereset.</p></form></div></div>';
    const em = DJ.LS.get('dj_email', '');
    if (em) document.getElementById('lgEmail').value = em;
    pasangPin(document.getElementById('lgPin'));
    if (pesan) galatLogin(pesan);
    document.getElementById(em ? 'lgPin' : 'lgEmail').querySelector ? (em ? document.querySelector('#lgPin input').focus() : document.getElementById('lgEmail').focus()) : null;
    document.getElementById('fLogin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('lgEmail').value.trim(), pin = UI.$$('#lgPin input').map((x) => x.value).join('');
      if (!email) return galatLogin('Email wajib diisi');
      if (!/^\d{6}$/.test(pin)) return galatLogin('PIN harus 6 angka');
      await UI.sibuk(document.getElementById('lgBtn'), async () => {
        try {
          const r = await DJ.api('auth.login', { email, pin });
          DJ.LS.set('dj_email', email);
          DJ.simpanSesi({ token: r.token, user: r.user });
          await masuk();
        } catch (err) { galatLogin(err.message || 'Gagal masuk'); UI.$$('#lgPin input').forEach((x) => { x.value = ''; }); const f = UI.$('#lgPin input'); if (f) f.focus(); }
      });
    });
  }
  function galatLogin(m) { const b = document.getElementById('lgErr'); if (!b) return; b.hidden = false; b.querySelector('p').textContent = m; }
  DJ.keLogin = (pesan) => { DJ.data = null; ruteAktif = ''; UI.tutupSemua(); tampilLogin(pesan); };

  /** Kotak PIN 6 digit: maju otomatis, mundur dengan Backspace, bisa tempel. */
  function pasangPin(wrap) {
    const ins = UI.$$('input', wrap);
    ins.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; } });
      inp.addEventListener('paste', (e) => {
        const t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        if (t.length > 1) { e.preventDefault(); t.split('').forEach((c, j) => { if (ins[j]) ins[j].value = c; }); (ins[t.length] || ins[5]).focus(); }
      });
    });
  }
  DJ.pasangPin = pasangPin;
  DJ.pinHtml = (id) => '<div class="pin-boxes" id="' + id + '">' + Array.from({ length: 6 }, (_, i) => '<input class="inp" inputmode="numeric" maxlength="1" autocomplete="off" aria-label="Digit ' + (i + 1) + '">').join('') + '</div>';
  DJ.ambilPin = (id) => UI.$$('#' + id + ' input').map((x) => x.value).join('');

  /** Dialog ganti PIN (wajib saat masuk pertama). */
  DJ.gantiPin = (wajib) => {
    const m = UI.modal({
      judul: wajib ? 'Buat PIN baru' : 'Ganti PIN', kunci: !!wajib,
      isi: (wajib ? '<div class="callout info">' + ic('lock') + '<p>Demi keamanan, ganti PIN sementara dari Admin dengan PIN pribadi Anda.</p></div>' : '') +
        '<div class="field"><label>PIN lama' + (wajib ? ' (dari Admin)' : '') + '</label>' + DJ.pinHtml('pinL') + '</div><div class="field"><label>PIN baru</label>' + DJ.pinHtml('pinB') + '</div><div class="field"><label>Ulangi PIN baru</label>' + DJ.pinHtml('pinU') + '</div><div class="err" id="pinErr" style="color:#B42318"></div>',
      kaki: (wajib ? '<button class="btn" data-act="keluar">Keluar</button>' : '<button class="btn" data-tutup>Batal</button>') + '<button class="btn pri" id="pinOk">Simpan PIN</button>'
    });
    ['pinL', 'pinB', 'pinU'].forEach((id) => pasangPin(document.getElementById(id)));
    document.getElementById('pinOk').addEventListener('click', (e) => UI.sibuk(e.currentTarget, async () => {
      const l = DJ.ambilPin('pinL'), b = DJ.ambilPin('pinB'), u = DJ.ambilPin('pinU'), err = document.getElementById('pinErr');
      if (!/^\d{6}$/.test(l) || !/^\d{6}$/.test(b)) { err.textContent = 'PIN harus 6 angka'; return; }
      if (b !== u) { err.textContent = 'Ulangan PIN baru tidak sama'; return; }
      try {
        const r = await DJ.api('auth.gantiPin', { pinLama: l, pinBaru: b });
        DJ.simpanSesi({ token: r.token, user: Object.assign({}, DJ.sesi.user, r.user, { wajibGantiPin: false }) });
        m.tutup(); UI.toast('PIN berhasil diganti');
      } catch (x) { err.textContent = x.message; }
    }));
  };

  async function masuk() {
    ruteAktif = '';
    root().innerHTML = '';
    const ada = DJ.muatCache();
    kerangka();
    DJ.render();
    if (DJ.sesi && DJ.sesi.user.wajibGantiPin) DJ.gantiPin(true);
    try {
      const ubah = await DJ.segarkan(!ada);
      if (ubah || !ada) { const t = document.querySelector('.brand small'); if (t) t.textContent = DJ.set('Nama_Puskesmas'); DJ.render(); }
    } catch (e) {
      if (!ada && DJ.sesi) document.getElementById('konten').innerHTML = UI.empty('cloud_off', 'Data belum bisa dimuat', e.message || 'Periksa koneksi lalu coba lagi.', '<button class="btn pri" data-act="coba-lagi">' + ic('refresh') + 'Coba lagi</button>');
      else if (e.code !== 'UNAUTHORIZED') UI.toast(e.message, 'warn');
    }
    mulaiSinkron();
  }
  DJ.on('coba-lagi', () => masuk());

  /* ---------------- PWA ---------------- */
  let promptPasang = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); promptPasang = e;
    if (DJ.LS.get('dj_tolak_pasang', 0) > Date.now()) return;
    let b = document.getElementById('btnPasang');
    if (!b) { b = document.createElement('button'); b.id = 'btnPasang'; b.className = 'btn pri install-btn'; b.innerHTML = ic('install_mobile') + 'Pasang aplikasi'; document.body.appendChild(b); }
    b.onclick = async () => { b.remove(); promptPasang.prompt(); const r = await promptPasang.userChoice; if (r.outcome !== 'accepted') DJ.LS.set('dj_tolak_pasang', Date.now() + 7 * 864e5); promptPasang = null; };
  });
  DJ.bisaPasang = () => !!promptPasang;
  DJ.pasangApp = () => { if (promptPasang) { promptPasang.prompt(); promptPasang = null; const b = document.getElementById('btnPasang'); if (b) b.remove(); } };
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw && sw.addEventListener('statechange', () => { if (sw.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Versi baru tersedia. Tutup lalu buka kembali aplikasi untuk memperbarui.', 'info', 8000); });
        });
      }).catch(() => { });
    });
  }

  /* ---------------- mulai ---------------- */
  document.addEventListener('DOMContentLoaded', () => { if (DJ.sesi && DJ.sesi.token) masuk(); else tampilLogin(); });
})(window.DJ);
