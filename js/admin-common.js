/* ============================================
   강화포도책방 — 공통 관리자 유틸리티
   ============================================ */
window.AC = (function () {
  const REPO_OWNER = 'podobooks-ganghwa';
  const REPO_NAME  = 'ganghwa';
  const ADMIN_PW   = '0402';
  const BASE_URL   = `https://podobooks-ganghwa.github.io/ganghwa`;

  /* ── 공통 CSS 주입 ── */
  const _css = `
    .img-zone{border:2px dashed #e5e7eb;border-radius:12px;padding:20px;text-align:center;transition:border-color .2s,background .2s;cursor:pointer}
    .img-zone:hover,.img-zone.drag{border-color:#7c3aed;background:#faf9ff}
    .img-zone__icon{font-size:1.6rem;margin-bottom:6px}
    .img-zone__text{font-size:.8rem;color:#9ca3af;margin-bottom:10px}
    .img-zone__btn{display:inline-block;padding:5px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-size:.78rem;cursor:pointer;font-family:inherit;color:#374151}
    .img-zone__btn:hover{background:#e5e7eb}
    .img-preview-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .img-thumb{position:relative;width:70px;height:70px;border-radius:8px;overflow:hidden;border:2px solid #e5e7eb}
    .img-thumb img{width:100%;height:100%;object-fit:cover}
    .img-thumb__rm{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;border:none;cursor:pointer;font-size:.6rem;display:flex;align-items:center;justify-content:center;padding:0;line-height:1}
    .card-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:4px;margin-top:14px;border-radius:10px;overflow:hidden}
    .card-img{width:100%;aspect-ratio:1;object-fit:cover;cursor:pointer;transition:opacity .15s;display:block}
    .card-img:hover{opacity:.82}
    .ac-lb{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px;cursor:zoom-out}
    .ac-lb.open{display:flex}
    .ac-lb img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;box-shadow:0 4px 40px rgba(0,0,0,.5);cursor:default}
    .ac-lb__x{position:absolute;top:16px;right:20px;color:#fff;font-size:2rem;cursor:pointer;background:none;border:none;line-height:1;opacity:.8}
    .ac-lb__x:hover{opacity:1}
  `;
  const _style = document.createElement('style');
  _style.textContent = _css;
  document.head.appendChild(_style);

  /* ── 라이트박스 주입 ── */
  const _lb = document.createElement('div');
  _lb.className = 'ac-lb';
  _lb.id = 'acLightbox';
  _lb.innerHTML = '<button class="ac-lb__x" id="acLbClose">✕</button><img id="acLbImg" src="" alt="" />';
  document.body.appendChild(_lb);
  document.getElementById('acLbClose').addEventListener('click', () => _lb.classList.remove('open'));
  _lb.addEventListener('click', e => { if (e.target === _lb) _lb.classList.remove('open'); });
  window.acOpenImg = function(src) {
    document.getElementById('acLbImg').src = src;
    _lb.classList.add('open');
  };

  /* ── 유틸 ── */
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function getToken() {
    let t = localStorage.getItem('_jt') || '';
    if (!t) {
      // sessionStorage → localStorage 자동 이전
      const ss = sessionStorage.getItem('_jt') || '';
      if (ss) { localStorage.setItem('_jt', ss); t = ss; }
    }
    return t;
  }
  function setToken(t) { if (t) { localStorage.setItem('_jt', t.trim()); sessionStorage.removeItem('_jt'); } }
  function checkPw(pw) { return pw === ADMIN_PW; }

  /* ── GitHub API ── */
  async function fetchJSON(path) {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  }

  async function saveJSON(path, data, msg) {
    const token = getToken();
    if (!token) throw new Error('NO_TOKEN');
    const infoRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (!infoRes.ok) throw new Error('파일 조회 실패');
    const { sha } = await infoRes.json();
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const putRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, content, sha })
      }
    );
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(putRes.status === 401 ? 'NO_TOKEN' : (err.message || '저장 실패'));
    }
  }

  /* ── 이미지 리사이즈 (클라이언트) ── */
  function resizeImg(file, maxW = 1200) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width  = Math.round(img.width  * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ── 이미지 1장 GitHub에 업로드 ── */
  async function uploadImg(file, folder) {
    const token = getToken();
    if (!token) throw new Error('NO_TOKEN');
    const dataUrl = await resizeImg(file);
    const base64  = dataUrl.split(',')[1];
    const ext  = file.type.includes('png') ? 'png' : 'jpg';
    const name = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.${ext}`;
    const path = `images/uploads/${folder}/${name}`;
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '사진 업로드', content: base64 })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(res.status === 401 ? 'NO_TOKEN' : (err.message || '이미지 업로드 실패'));
    }
    return path;
  }

  /* ── 이미지 여러 장 업로드 ── */
  async function uploadImgs(files, folder, onProgress) {
    const paths = [];
    for (let i = 0; i < files.length; i++) {
      if (onProgress) onProgress(`사진 업로드 중… (${i + 1}/${files.length})`);
      paths.push(await uploadImg(files[i], folder));
    }
    return paths;
  }

  /* ── 이미지 업로더 UI 생성 ── */
  function createUploader(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return null;
    const uid = containerId;
    wrap.innerHTML = `
      <div class="img-zone" id="${uid}_zone">
        <input type="file" id="${uid}_input" accept="image/*" multiple style="display:none" />
        <div class="img-zone__icon">📷</div>
        <div class="img-zone__text">사진을 선택하거나 드래그하세요 (여러 장 가능)</div>
        <button type="button" class="img-zone__btn" onclick="document.getElementById('${uid}_input').click()">사진 선택</button>
      </div>
      <div class="img-preview-strip" id="${uid}_strip"></div>`;

    let files = [];

    const input = document.getElementById(`${uid}_input`);
    const zone  = document.getElementById(`${uid}_zone`);
    const strip = document.getElementById(`${uid}_strip`);

    function refresh() {
      strip.innerHTML = files.map((f, i) => {
        const url = URL.createObjectURL(f);
        return `<div class="img-thumb"><img src="${url}" alt="" /><button type="button" class="img-thumb__rm" onclick="window.__ac_rm_${uid}(${i})">✕</button></div>`;
      }).join('');
    }

    window[`__ac_rm_${uid}`] = i => { files.splice(i, 1); refresh(); };

    input.addEventListener('change', () => {
      files = [...files, ...Array.from(input.files)];
      input.value = '';
      refresh();
    });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag');
      files = [...files, ...Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))];
      refresh();
    });

    return {
      getFiles: () => files,
      reset: () => { files = []; refresh(); }
    };
  }

  /* ── 카드에 이미지 그리드 렌더 ── */
  function imgHtml(images) {
    if (!images || !images.length) return '';
    return `<div class="card-imgs">${images.map(p =>
      `<img class="card-img" src="${BASE_URL}/${p}" alt="" onclick="acOpenImg('${BASE_URL}/${p}')" />`
    ).join('')}</div>`;
  }

  /* ── 토큰 프롬프트 ── */
  function promptToken() {
    const t = prompt(
      '🔑 GitHub Token 입력\n\n처음이라면:\n1. github.com/settings/tokens/new 접속\n2. repo 권한 체크 → Generate\n3. 복사 후 여기 붙여넣기'
    );
    if (t) setToken(t);
    return t ? t.trim() : '';
  }

  /* ── 비밀번호 + FAB 모달 주입 ── */
  function injectModals(opts) {
    const html = `
    <div class="modal-overlay" id="pwOverlay">
      <div class="pw-modal">
        <div class="pw-modal__icon">🔐</div>
        <h2 class="pw-modal__title">관리자 로그인</h2>
        <p class="pw-modal__sub">비밀번호를 입력하세요</p>
        <input type="password" class="pw-modal__input" id="acPwInput" placeholder="비밀번호" />
        <p class="pw-modal__error" id="acPwError" style="display:none">비밀번호가 맞지 않아요</p>
        <button class="pw-modal__btn" id="acPwBtn">확인</button>
      </div>
    </div>
    <button class="admin-fab" id="acFab" title="관리자">✏️</button>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('acFab').addEventListener('click', () => {
      document.getElementById('pwOverlay').classList.add('open');
      setTimeout(() => document.getElementById('acPwInput').focus(), 100);
    });
    document.getElementById('pwOverlay').addEventListener('click', e => {
      if (e.target.id === 'pwOverlay') closePwModal();
    });
    document.getElementById('acPwBtn').addEventListener('click', () => tryLogin(opts));
    document.getElementById('acPwInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') tryLogin(opts);
    });
  }

  function closePwModal() {
    document.getElementById('pwOverlay').classList.remove('open');
    document.getElementById('acPwInput').value = '';
    document.getElementById('acPwError').style.display = 'none';
  }

  function tryLogin(opts) {
    const pw = document.getElementById('acPwInput').value;
    if (checkPw(pw)) {
      closePwModal();
      if (!getToken()) promptToken();
      if (opts && opts.onSuccess) opts.onSuccess();
    } else {
      document.getElementById('acPwError').style.display = 'block';
      document.getElementById('acPwInput').value = '';
    }
  }

  function setStatus(elId, type, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.className = 'save-status ' + type;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  /* ── 백업 다운로드 ── */
  function downloadBackup(data, prefix) {
    try {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const filename = `강화포도책방_${prefix}_${ts}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) {
      console.warn('백업 다운로드 실패:', e);
    }
  }

  return { esc, getToken, setToken, checkPw, fetchJSON, saveJSON, promptToken, injectModals, setStatus, fmtDate, createUploader, uploadImgs, imgHtml, downloadBackup };
})();
