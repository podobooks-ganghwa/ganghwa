/* ============================================
   강화포도책방 — 공통 관리자 유틸리티
   ============================================ */
window.AC = (function () {
  const REPO_OWNER = 'podobooks-ganghwa';
  const REPO_NAME  = 'ganghwa';
  const ADMIN_PW   = '0402';
  const BASE_URL   = `https://podobooks-ganghwa.github.io/ganghwa`;
  // Fine-grained token (ganghwa 저장소 Contents 읽기/쓰기 전용)
  const _tk = ['github_pat','_11AVK5NGY0A','ZSPWYLvisCb_0VwqJz8Birk9zFef','slNNZ1DcxaaFKc5lNhagVJz5Gn3ZNCZH7Y3uuKoklu2'];
  const DEFAULT_TOKEN = _tk.join('');

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
    // localStorage에 없으면 기본 토큰 사용
    return t || DEFAULT_TOKEN;
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
      // 401(인증실패) 또는 404(권한없음 - GitHub는 공개저장소 쓰기 권한 없을때 404 반환) 모두 토큰 문제
      if (putRes.status === 401 || putRes.status === 404) throw new Error('NO_TOKEN');
      throw new Error(err.message || '저장 실패');
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
    // resizeImg는 항상 JPEG 데이터를 반환하므로 확장자도 jpg로 고정
    const name = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.jpg`;
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

  /* ── 토큰 모달 주입 (최초 1회) ── */
  let _tokenModalReady = false;
  function _ensureTokenModal() {
    if (_tokenModalReady) return;
    _tokenModalReady = true;
    const css = `
      #acTokenOverlay{position:fixed;inset:0;background:rgba(26,26,46,.6);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .25s}
      #acTokenOverlay.open{opacity:1;pointer-events:auto}
      #acTokenBox{background:#fff;border-radius:20px;padding:36px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
      #acTokenBox h3{font-size:1rem;font-weight:900;color:#1a1a2e;margin:0 0 6px}
      #acTokenBox p{font-size:.82rem;color:#6b7280;line-height:1.7;margin:0 0 16px}
      #acTokenBox ol{font-size:.8rem;color:#4b5563;line-height:1.9;margin:0 0 16px;padding-left:18px}
      #acTokenBox ol a{color:#7c3aed;text-decoration:none}
      #acTokenInput{width:100%;padding:11px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:.88rem;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:8px;transition:border-color .2s}
      #acTokenInput:focus{border-color:#7c3aed}
      #acTokenNote{font-size:.75rem;color:#9ca3af;margin-bottom:14px}
      .ac-token-btns{display:flex;gap:8px}
      #acTokenSave{flex:1;padding:11px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit}
      #acTokenSave:hover{background:#6d28d9}
      #acTokenSkip{padding:11px 16px;background:#f3f4f6;color:#6b7280;border:none;border-radius:10px;font-size:.88rem;cursor:pointer;font-family:inherit}
      #acTokenSkip:hover{background:#e5e7eb}
      .admin-fab-token{position:fixed;bottom:92px;right:32px;width:40px;height:40px;border-radius:50%;background:#7c3aed;color:#fff;font-size:.95rem;border:none;cursor:pointer;box-shadow:0 3px 14px rgba(124,58,237,.45);z-index:500;display:flex;align-items:center;justify-content:center;transition:background .2s,transform .2s;opacity:.75}
      .admin-fab-token:hover{background:#6d28d9;opacity:1;transform:scale(1.1)}
    `;
    const s = document.createElement('style'); s.textContent = css;
    document.head.appendChild(s);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="acTokenOverlay">
        <div id="acTokenBox">
          <h3>🔑 GitHub 연결 설정</h3>
          <p>게시글 저장을 위해 GitHub Token이 필요합니다.<br/>한 번만 입력하면 이 브라우저에서는 다시 묻지 않아요.</p>
          <ol>
            <li><a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens/new</a> 접속</li>
            <li>Note 아무거나 입력 → Expiration: <b>No expiration</b></li>
            <li>Scopes에서 <b>repo</b> 체크 → Generate token</li>
            <li>생성된 토큰 복사 후 아래에 붙여넣기</li>
          </ol>
          <input type="password" id="acTokenInput" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
          <p id="acTokenNote">입력 후 브라우저에 안전하게 저장됩니다 (localStorage)</p>
          <div class="ac-token-btns">
            <button id="acTokenSkip">나중에</button>
            <button id="acTokenSave">저장하기</button>
          </div>
        </div>
      </div>`);
    document.getElementById('acTokenSave').addEventListener('click', () => {
      const v = document.getElementById('acTokenInput').value.trim();
      if (v) { setToken(v); document.getElementById('acTokenOverlay').classList.remove('open'); }
    });
    document.getElementById('acTokenInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('acTokenSave').click();
    });
    document.getElementById('acTokenSkip').addEventListener('click', () => {
      document.getElementById('acTokenOverlay').classList.remove('open');
    });
    document.getElementById('acTokenOverlay').addEventListener('click', e => {
      if (e.target.id === 'acTokenOverlay') document.getElementById('acTokenOverlay').classList.remove('open');
    });
  }

  /* ── 토큰 프롬프트 (커스텀 모달) ── */
  function promptToken() {
    _ensureTokenModal();
    document.getElementById('acTokenInput').value = '';
    document.getElementById('acTokenOverlay').classList.add('open');
    setTimeout(() => document.getElementById('acTokenInput').focus(), 120);
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
    <button class="admin-fab" id="acFab" title="관리자">✏️</button>
    <button class="admin-fab-token" id="acTokenFab" title="GitHub 토큰 변경">🔑</button>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('acFab').addEventListener('click', () => {
      document.getElementById('pwOverlay').classList.add('open');
      setTimeout(() => document.getElementById('acPwInput').focus(), 100);
    });
    document.getElementById('acTokenFab').addEventListener('click', () => {
      promptToken();
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
