// ScreenTrail 웹 - 탭 이동, 기능 데모 전환, 댓글.

// 설치 파일 주소가 준비되면 여기에만 넣으면 모든 "무료 다운로드" 버튼에 연결된다.
// 예: 'https://github.com/아이디/저장소/releases/latest/download/ScreenTrail-0.1.16-Setup.exe'
const DOWNLOAD_URL = '';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 토스트 ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.hidden = false;
  toastEl.classList.remove('is-show');
  void toastEl.offsetWidth;
  toastEl.classList.add('is-show');
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

/* ---------- 다운로드 버튼 ---------- */
$$('[data-download]').forEach((a) => {
  if (DOWNLOAD_URL) {
    a.href = DOWNLOAD_URL;
    a.setAttribute('download', '');
  } else {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      toast('다운로드 링크를 준비하고 있어요. 조금만 기다려 주세요.');
    });
  }
});

/* ---------- 테마 ---------- */
const themeBtn = $('[data-theme-toggle]');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light')) === 'dark';
function syncThemeIcon() {
  const icon = $('i', themeBtn);
  icon.className = `ph ${isDark() ? 'ph-sun' : 'ph-moon'}`;
  themeBtn.setAttribute('aria-label', isDark() ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기');
}
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('st-theme', next); } catch (e) { /* 저장 불가 환경은 무시 */ }
  syncThemeIcon();
});
darkQuery.addEventListener('change', syncThemeIcon);
syncThemeIcon();

/* ---------- 상단 탭: 현재 구역 표시 ---------- */
const tabLinks = $$('[data-nav]');
const tabInd = $('.tabs-ind');
function moveIndicator(link) {
  tabInd.style.setProperty('--ind-x', `${link.offsetLeft}px`);
  tabInd.style.setProperty('--ind-w', `${link.offsetWidth}px`);
}
function setActiveTab(name) {
  tabLinks.forEach((a) => {
    const on = a.dataset.nav === name;
    if (on) { a.setAttribute('aria-current', 'true'); moveIndicator(a); }
    else a.removeAttribute('aria-current');
  });
}
// 화면 위쪽 1/3 지점을 지나고 있는 구역을 현재 탭으로 본다.
const groupObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => { if (en.isIntersecting) setActiveTab(en.target.dataset.group); });
}, { rootMargin: '-35% 0px -60% 0px' });
$$('[data-group]').forEach((g) => groupObserver.observe(g));
tabLinks.forEach((a) => a.addEventListener('click', () => setActiveTab(a.dataset.nav)));
// #support 같은 섹션 주소로 들어오면, 글꼴·레이아웃이 자리 잡은 뒤 그 위치로 이동한다.
if (location.hash.length > 1) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) addEventListener('load', () => target.scrollIntoView({ behavior: 'auto' }), { once: true });
}
addEventListener('resize', () => moveIndicator($('[data-nav][aria-current]') || tabLinks[0]));
document.fonts?.ready.then(() => moveIndicator($('[data-nav][aria-current]') || tabLinks[0]));
moveIndicator(tabLinks[0]);

/* ---------- 기능 탭 (10가지 도구) ---------- */
$$('[data-tabs]').forEach((box) => {
  const tabs = $$('[role="tab"]', box);
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key in keys) {
        e.preventDefault();
        select(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1], true);
      }
    });
  });
});

/* ---------- 후기 가로 스크롤 ---------- */
const rail = $('.rail');
$$('[data-rail]').forEach((btn) => btn.addEventListener('click', () => {
  const step = rail.firstElementChild.getBoundingClientRect().width + 20;
  rail.scrollBy({ left: btn.dataset.rail === 'next' ? step : -step, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}));

/* ---------- 스크롤 등장, 화면 밖 애니메이션 정지 ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); revealObserver.unobserve(en.target); }
  });
}, { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach((el) => revealObserver.observe(el));

const animObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => en.target.classList.toggle('is-off', !en.isIntersecting));
});
$$('[data-anim]').forEach((el) => animObserver.observe(el));

const video = $('.player video');
if (video) {
  if (reduceMotion.matches) { video.removeAttribute('autoplay'); video.pause(); }
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting && !video.paused) { video.dataset.autoPaused = '1'; video.pause(); }
    else if (en.isIntersecting && video.dataset.autoPaused) { delete video.dataset.autoPaused; video.play().catch(() => {}); }
  }, { threshold: .25 }).observe(video);
}

/* ---------- 댓글 ---------- */
const API = '/api/comments';
const list = $('[data-comment-list]');
const countEl = $('[data-comment-count]');
const emptyEl = $('[data-comment-empty]');
const errorEl = $('[data-comment-error]');
const errorText = $('[data-comment-error-text]');
const form = $('[data-comment-form]');
const status = $('.c-status', form);
let comments = [];
const openedAt = Date.now();

const timeFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function commentItem(c, isNew) {
  const li = document.createElement('li');
  li.className = `c-item${isNew ? ' is-new' : ''}`;
  const av = document.createElement('span');
  av.className = 'c-av';
  av.setAttribute('aria-hidden', 'true');
  av.textContent = [...c.name][0] || '?';
  const main = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'c-meta';
  const name = document.createElement('b');
  name.textContent = c.name;
  const time = document.createElement('time');
  time.dateTime = c.createdAt;
  time.textContent = timeFmt.format(new Date(c.createdAt));
  meta.append(name, time);
  const body = document.createElement('p');
  body.className = 'c-body';
  body.textContent = c.body;
  main.append(meta, body);
  li.append(av, main);
  return li;
}

function renderComments(newId) {
  list.replaceChildren(...comments.map((c) => commentItem(c, c.id === newId)));
  list.setAttribute('aria-busy', 'false');
  countEl.textContent = comments.length;
  emptyEl.hidden = comments.length > 0;
  errorEl.hidden = true;
}

async function loadComments() {
  list.setAttribute('aria-busy', 'true');
  errorEl.hidden = true;
  try {
    const res = await fetch(API, { headers: { accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'load_failed');
    comments = data.comments || [];
    renderComments();
  } catch (err) {
    list.replaceChildren();
    list.setAttribute('aria-busy', 'false');
    emptyEl.hidden = true;
    errorEl.hidden = false;
    errorText.textContent = err.message === 'not_configured'
      ? '댓글 기능을 준비하고 있습니다. 곧 열릴 예정이에요.'
      : '댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
$('[data-comment-retry]').addEventListener('click', loadComments);

const bodyInput = $('#c-body');
const nameInput = $('#c-name');
const counter = $('[data-count]', form);
bodyInput.addEventListener('input', () => { counter.textContent = bodyInput.value.length; });

function fieldError(input, message) {
  const err = $(`#${input.id}-err`);
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  err.textContent = message || '';
  err.hidden = !message;
}
[nameInput, bodyInput].forEach((el) => el.addEventListener('input', () => fieldError(el, '')));

const errorMessages = {
  name_required: '이름을 입력해 주세요.',
  body_required: '내용을 두 글자 이상 입력해 주세요.',
  too_fast: '조금 뒤에 다시 등록해 주세요.',
  not_configured: '댓글 기능을 준비하고 있습니다. 곧 열릴 예정이에요.',
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const body = bodyInput.value.trim();
  fieldError(nameInput, name ? '' : '이름을 입력해 주세요.');
  fieldError(bodyInput, body.length >= 2 ? '' : '내용을 두 글자 이상 입력해 주세요.');
  if (!name) return nameInput.focus();
  if (body.length < 2) return bodyInput.focus();

  const button = $('button[type="submit"]', form);
  button.disabled = true;
  status.classList.remove('is-error');
  status.textContent = '등록하는 중...';
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, body, website: $('#c-website').value, t: openedAt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'save_failed');
    if (data.comment) {
      comments = [data.comment, ...comments];
      renderComments(data.comment.id);
    }
    bodyInput.value = '';
    counter.textContent = '0';
    status.textContent = '댓글이 등록되었습니다.';
  } catch (err) {
    status.classList.add('is-error');
    status.textContent = errorMessages[err.message] || '등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    button.disabled = false;
  }
});

loadComments();
