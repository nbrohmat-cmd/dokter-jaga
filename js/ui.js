/* ui.js — komponen tampilan: ikon, avatar, chip, badge, toast, laci (drawer), modal, konfirmasi, menu, grafik SVG, kerangka muat. */
'use strict';
(function (DJ) {
  const esc = DJ.esc;
  const UI = DJ.UI = {};

  UI.$ = (s, r) => (r || document).querySelector(s);
  UI.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  UI.ic = (n, cls) => '<span class="ms ' + (cls || '') + '" aria-hidden="true">' + n + '</span>';

  UI.av = (u, cls) => {
    const nama = typeof u === 'string' ? DJ.nama(u) : u ? u.nama : '?';
    const warna = (typeof u === 'string' ? ((DJ.idx.user || {})[u] || {}).warna : u && u.warna) || '#1E7A4F';
    return '<span class="av ' + (cls || '') + '" style="--c:' + esc(warna) + '" title="' + esc(nama) + '">' + esc(DJ.inisial(nama)) + '</span>';
  };
  UI.chip = (kode, opt) => {
    opt = opt || {};
    const teks = opt.teks || DJ.kodePendek(kode);
    const cls = 'chip ' + (kode === 'LPT' ? 'lpt ' : '') + (opt.cls || '') + (opt.act ? ' click' : '');
    const attr = opt.act ? ' data-act="' + opt.act + '" data-id="' + esc(opt.id || '') + '" role="button" tabindex="0"' : '';
    return '<span class="' + cls + '" style="--c:' + DJ.warna(kode) + '"' + attr + ' title="' + esc(opt.title || DJ.namaKeg(kode)) + '">' + esc(teks) + '</span>';
  };
  UI.badge = (teks, cls, ikon) => '<span class="badge ' + (cls || '') + '">' + (ikon ? UI.ic(ikon) : '') + esc(teks) + '</span>';
  UI.statusBadge = (st) => {
    const m = { 'Terbit': 'b-green', 'Disetujui': 'b-green', 'Dijadwalkan': 'b-green', 'Aktif': 'b-green', 'Sah': 'b-green', 'Selesai': 'b-slate', 'OK': 'b-green',
      'Draf': 'b-slate', 'Dikunci': 'b-blue', 'Ditukar': 'b-blue', 'Tetap': 'b-green', 'Pengganti': 'b-blue', 'Menunggu Rekan': 'b-amber', 'Menunggu Persetujuan': 'b-amber', 'Perlu Cek': 'b-amber', 'Perlu Pengganti': 'b-red',
      'Ditolak': 'b-red', 'Ditolak Rekan': 'b-red', 'Dibatalkan': 'b-gray', 'Kedaluwarsa': 'b-gray', 'Batal': 'b-gray', 'Diabaikan': 'b-gray', 'Nonaktif': 'b-gray' };
    return UI.badge(st, m[st] || 'b-slate');
  };
  UI.who = (id, sub, cls) => '<div class="who">' + UI.av(id, cls) + '<div><b>' + esc(DJ.nama(id)) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
  UI.empty = (ikon, judul, teks, tombol) => '<div class="empty"><div class="ill">' + UI.ic(ikon) + '</div><b>' + esc(judul) + '</b>' + (teks ? '<span>' + esc(teks) + '</span>' : '') + (tombol || '') + '</div>';
  UI.sk = (n, cls) => Array.from({ length: n || 3 }, () => '<div class="sk ' + (cls || 'sk-line') + '"></div>').join('');
  UI.opsi = (items, nilai) => items.map((x) => { const v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
  UI.pillSel = (act, ikon, items, nilai, label) => '<label class="pill-sel">' + UI.ic(ikon) + '<span class="sr">' + esc(label || '') + '</span><select data-chg="' + act + '" aria-label="' + esc(label || '') + '">' + UI.opsi(items, nilai) + '</select>' + UI.ic('expand_more') + '</label>';
  UI.seg = (act, items, nilai, cls) => '<div class="seg ' + (cls || '') + '" role="tablist">' + items.map((x) => '<button type="button" role="tab" data-act="' + act + '" data-v="' + esc(x[0]) + '" class="' + (String(x[0]) === String(nilai) ? 'on' : '') + '" aria-selected="' + (String(x[0]) === String(nilai)) + '">' + (x[2] ? UI.ic(x[2]) : '') + esc(x[1]) + '</button>').join('') + '</div>';

  /* ---------------- toast ---------------- */
  UI.toast = (msg, jenis, ms) => {
    let wrap = UI.$('.toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const ik = { ok: 'check_circle', err: 'error', warn: 'warning', info: 'info' }[jenis || 'ok'];
    const t = document.createElement('div'); t.className = 'toast ' + (jenis || 'ok');
    t.innerHTML = UI.ic(ik) + '<div>' + esc(msg) + '</div>';
    wrap.appendChild(t);
    while (wrap.children.length > 3) wrap.firstChild.remove();     // paling banyak 3 sekaligus
    setTimeout(() => t.remove(), ms || (jenis === 'err' ? 6000 : 3200));
  };
  UI.galat = (e) => UI.toast((e && e.message) || 'Terjadi kesalahan', 'err');

  /* ---------------- tombol sibuk ---------------- */
  UI.sibuk = async (btn, fn) => {
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    try { return await fn(); } finally { if (btn && btn.isConnected) { btn.classList.remove('loading'); btn.disabled = false; } }
  };

  /* ---------------- laci & modal ---------------- */
  let tumpukan = [];
  UI.tutupSemua = () => { tumpukan.slice().forEach((x) => x.tutup()); };
  function lapis(el, opt) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    document.body.appendChild(scrim); document.body.appendChild(el);
    const fokusLama = document.activeElement;
    const obj = {
      el, tutup() {
        if (!el.isConnected) return; el.remove(); scrim.remove(); tumpukan = tumpukan.filter((x) => x !== obj);
        if (opt.onClose) opt.onClose(); if (fokusLama && fokusLama.focus) try { fokusLama.focus(); } catch (e) { }
      }
    };
    scrim.addEventListener('click', () => { if (!opt.kunci) obj.tutup(); });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-tutup]')) obj.tutup(); });
    tumpukan.push(obj);
    setTimeout(() => { const f = el.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.pri'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }, 30);
    return obj;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tumpukan.length) tumpukan[tumpukan.length - 1].tutup(); });

  UI.laci = (opt) => {
    const el = document.createElement('aside');
    el.className = 'drawer' + (opt.lebar ? ' wide' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', opt.judul || '');
    el.innerHTML = '<div class="drawer-h">' + (opt.ikon ? '<span class="kpi"><span class="ic">' + UI.ic(opt.ikon) + '</span></span>' : '') + '<h3>' + esc(opt.judul || '') + '</h3><button class="ico-btn" data-tutup aria-label="Tutup">' + UI.ic('close') + '</button></div>' +
      '<div class="drawer-b">' + (opt.isi || '') + '</div>' + (opt.kaki ? '<div class="drawer-f">' + opt.kaki + '</div>' : '');
    return lapis(el, opt);
  };
  UI.modal = (opt) => {
    const el = document.createElement('div');
    el.className = 'modal' + (opt.lebar ? ' wide' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = (opt.judul ? '<div class="row sb"><h3>' + esc(opt.judul) + '</h3>' + (opt.kunci ? '' : '<button class="ico-btn" data-tutup aria-label="Tutup">' + UI.ic('close') + '</button>') + '</div>' : '') + (opt.isi || '') + (opt.kaki ? '<div class="row end">' + opt.kaki + '</div>' : '');
    return lapis(el, opt);
  };
  UI.konfirmasi = (opt) => new Promise((res) => {
    let jawab = false;
    const m = UI.modal({
      judul: opt.judul, isi: '<p style="margin:0">' + (opt.htmlPesan || esc(opt.pesan || '')) + '</p>',
      kaki: '<button class="btn" data-tutup>' + esc(opt.batal || 'Batal') + '</button><button class="btn ' + (opt.bahaya ? 'danger' : 'pri') + '" data-ok>' + esc(opt.ok || 'Ya, lanjutkan') + '</button>',
      onClose: () => res(jawab)
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { jawab = true; m.tutup(); });
  });
  /** Minta teks (mis. alasan wajib). Mengembalikan string atau null bila batal. */
  UI.minta = (opt) => new Promise((res) => {
    let hasil = null;
    const m = UI.modal({
      judul: opt.judul,
      isi: (opt.pesan ? '<p class="muted" style="margin:0">' + opt.pesan + '</p>' : '') + '<div class="field"><label>' + esc(opt.label || 'Alasan') + (opt.wajib ? ' <span class="req">*</span>' : '') + '</label>' +
        (opt.area ? '<textarea class="inp" data-v maxlength="300" placeholder="' + esc(opt.placeholder || '') + '"></textarea>' : '<input class="inp" data-v maxlength="300" placeholder="' + esc(opt.placeholder || '') + '">') + '<span class="err" hidden></span></div>',
      kaki: '<button class="btn" data-tutup>Batal</button><button class="btn ' + (opt.bahaya ? 'danger' : 'pri') + '" data-ok>' + esc(opt.ok || 'Simpan') + '</button>',
      onClose: () => res(hasil)
    });
    const kirim = () => {
      const v = m.el.querySelector('[data-v]').value.trim();
      if (opt.wajib && !v) { const e = m.el.querySelector('.err'); e.hidden = false; e.textContent = (opt.label || 'Alasan') + ' wajib diisi'; return; }
      hasil = v; m.tutup();
    };
    m.el.querySelector('[data-ok]').addEventListener('click', kirim);
    m.el.querySelector('[data-v]').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !opt.area) kirim(); });
  });

  /* ---------------- menu melayang ---------------- */
  UI.menu = (anchor, items) => {
    UI.$$('.menu-pop').forEach((x) => x.remove());
    const m = document.createElement('div'); m.className = 'menu-pop' + (items.cls ? ' ' + items.cls : ''); m.setAttribute('role', 'menu');
    m.innerHTML = items.html || items.map((x, i) => x === '-' ? '<hr style="border:0;border-top:1px solid var(--garis);margin:4px 0">' : '<button role="menuitem" data-i="' + i + '">' + UI.ic(x.ikon) + esc(x.teks) + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), w = m.offsetWidth, hh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    m.style.top = (r.bottom + hh + 8 > window.innerHeight ? Math.max(8, r.top - hh - 6) : r.bottom + 6) + 'px';
    const tutup = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', tutup, true); } };
    setTimeout(() => document.addEventListener('mousedown', tutup, true), 0);
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { m.remove(); items[+b.dataset.i].fn(); } else if (e.target.closest('a,[data-act]')) setTimeout(() => m.remove(), 0); });
    return m;
  };

  /* ---------------- grafik SVG ---------------- */
  /** Batang vertikal per dokter dengan garis target putus-putus. items: [{label, nilai, target, status:'ok'|'up'|'down'}] */
  UI.grafikBatang = (items, opt) => {
    opt = opt || {};
    const W = 640, H = 240, pl = 8, pr = 8, pt = 26, pb = 30, n = items.length || 1;
    const maks = Math.max(1, ...items.map((x) => Math.max(x.nilai, x.target || 0))) * 1.15;
    const lebar = (W - pl - pr) / n, bw = Math.min(56, lebar * 0.5);
    const y = (v) => pt + (H - pt - pb) * (1 - v / maks);
    const warna = { ok: ['#1E7A4F', '#1E7A4F'], up: ['#FEF3C7', '#F59E0B'], down: ['#FEE2E2', '#DC4C4C'] };
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.judul || 'Grafik') + '">';
    [0.25, 0.5, 0.75, 1].forEach((f) => { s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(maks * f / 1.15) + '" y2="' + y(maks * f / 1.15) + '" stroke="#EEF2EF"/>'; });
    items.forEach((x, i) => {
      const cx = pl + lebar * i + lebar / 2, w = warna[x.status || 'ok'], top = y(x.nilai);
      s += '<rect x="' + (cx - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + Math.max(0, y(0) - top) + '" rx="8" fill="' + w[0] + '" stroke="' + w[1] + '" stroke-width="' + (x.status === 'ok' ? 0 : 2) + '"/>';
      s += '<text x="' + cx + '" y="' + (top - 7) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + (x.status === 'ok' ? '#17231D' : w[1]) + '">' + esc(x.teksNilai || DJ.num(x.nilai)) + '</text>';
      s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" fill="#66756D">' + esc(x.label) + '</text>';
    });
    if (opt.target != null) {
      const ty = y(opt.target);
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + ty + '" y2="' + ty + '" stroke="#9AA6A0" stroke-width="1.5" stroke-dasharray="6 5"/>';
      s += '<rect x="' + (W - pr - 92) + '" y="' + (ty - 18) + '" width="92" height="16" rx="4" fill="#F4F7F5"/><text x="' + (W - pr - 4) + '" y="' + (ty - 6) + '" text-anchor="end" font-size="11" fill="#66756D">Target ' + DJ.num(opt.target) + '</text>';
    }
    // versi HP: batang mendatar (teks tetap terbaca di layar sempit)
    const mk = Math.max(1, ...items.map((x) => Math.max(x.nilai, x.target || 0))) * 1.1;
    const hb = '<div class="hbars show-m" role="img" aria-label="' + esc(opt.judul || 'Grafik') + '">' + items.map((x) => {
      const sel = x.target != null ? x.nilai - x.target : 0, kls = x.status || 'ok';
      return '<div class="hb ' + kls + '"><div class="hb-t"><b>' + esc(x.label) + '</b><span>' + esc(x.teksNilai || DJ.num(x.nilai)) + (x.target != null && kls !== 'ok' ? ' (' + DJ.sel(Math.round(sel * 10) / 10) + ')' : x.target != null ? ' (sesuai)' : '') + '</span></div>' +
        '<div class="hb-tr"><i style="width:' + Math.min(100, x.nilai / mk * 100).toFixed(1) + '%"></i>' + (x.target != null ? '<em style="left:' + Math.min(100, x.target / mk * 100).toFixed(1) + '%"></em>' : '') + '</div></div>';
    }).join('') + (opt.target != null ? '<div class="small muted">┆ Garis target rata-rata ' + DJ.num(opt.target) + '</div>' : '') + '</div>';
    return '<div class="chart hide-m">' + s + '</svg></div>' + hb;
  };
  /** Garis riwayat. pts: [{label, nilai}] */
  UI.grafikGaris = (pts, opt) => {
    opt = opt || {};
    const hp = window.innerWidth < 768, W = hp ? 330 : 520, H = hp ? 170 : 200, pl = 30, pr = 12, pt = 14, pb = 26, n = pts.length;   // di HP viewBox lebih kecil → teks lebih besar
    if (!n) return UI.empty('show_chart', 'Belum ada riwayat');
    const maks = Math.max(1, ...pts.map((p) => p.nilai)) * 1.15;
    const x = (i) => pl + (W - pl - pr) * (n === 1 ? 0.5 : i / (n - 1)), y = (v) => pt + (H - pt - pb) * (1 - v / maks);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.judul || 'Riwayat') + '">';
    [0, 0.5, 1].forEach((f) => { const v = maks / 1.15 * f; s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#EEF2EF"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="10" fill="#66756D">' + DJ.num(v, 0) + '</text>'; });
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.nilai).toFixed(1)).join(' ');
    s += '<path d="' + d + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + 'Z" fill="#1E7A4F" fill-opacity=".08"/><path d="' + d + '" fill="none" stroke="#1E7A4F" stroke-width="2.5" stroke-linejoin="round"/>';
    const langkah = Math.ceil(n / 9);
    pts.forEach((p, i) => {
      s += '<circle cx="' + x(i) + '" cy="' + y(p.nilai) + '" r="' + (i === n - 1 ? 5 : 3.5) + '" fill="#fff" stroke="#1E7A4F" stroke-width="2"><title>' + esc(p.label + ': ' + DJ.num(p.nilai, 2)) + '</title></circle>';
      if (i % langkah === 0 || i === n - 1) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="' + (i === n - 1 ? '#17231D' : '#66756D') + '" font-weight="' + (i === n - 1 ? 700 : 400) + '">' + esc(p.label) + '</text>';
    });
    return '<div class="chart">' + s + '</svg></div>';
  };
  /** Batang horizontal bertumpuk. rows: [{label, total, parts:[{nilai, warna, nama}]}] */
  UI.grafikTumpuk = (rows, legenda) => {
    const maks = Math.max(1, ...rows.map((r) => r.total));
    return '<div class="bars-h">' + rows.map((r) => '<div class="bh-row"><div class="bh-top"><span>' + esc(r.label) + '</span><b class="tnum">' + esc(r.teksTotal || r.total) + '</b></div><div class="bh-bar" style="width:' + Math.max(8, r.total / maks * 100) + '%">' +
      r.parts.filter((p) => p.nilai > 0).map((p) => '<i style="width:' + (p.nilai / r.total * 100) + '%;background:' + p.warna + '" title="' + esc(p.nama + ': ' + p.nilai) + '"></i>').join('') + '</div></div>').join('') + '</div>' +
      (legenda ? '<div class="legend" style="margin-top:14px">' + legenda.map((l) => '<span><i style="background:' + l[1] + ';border-radius:50%"></i>' + esc(l[0]) + '</span>').join('') + '</div>' : '');
  };

  /* ---------------- pembaca berkas ---------------- */
  UI.bacaBerkas = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });

  /** Buka/unduh PDF dari base64 hasil server. */
  UI.bukaPdf = (hasil) => {
    const blob = DJ.b64ToBlob(hasil.base64, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) DJ.unduh(hasil.nama, blob);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
})(window.DJ);
