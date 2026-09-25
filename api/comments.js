import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

// 모든 댓글을 비공개 Blob 파일 하나(JSON 배열)에 보관한다.
const PATH = 'comments/data.json';
const LIMITS = { name: 20, body: 1000, total: 1000 };
const MIN_FILL_MS = 2500;     // 폼을 연 뒤 이보다 빨리 제출하면 봇으로 본다
const COOLDOWN_MS = 20_000;   // 같은 IP의 연속 작성 간격 (인스턴스 단위, 최선 노력)
const lastPostByIp = new Map();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function storeReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

async function load() {
  const res = await get(PATH, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200) return { items: [], etag: null };
  try {
    const items = JSON.parse(await new Response(res.stream).text());
    return { items: Array.isArray(items) ? items : [], etag: res.blob.etag };
  } catch {
    return { items: [], etag: res.blob.etag };
  }
}

async function save(items, etag) {
  await put(PATH, JSON.stringify(items), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

// 동시에 두 명이 쓰면 ETag가 어긋나므로 다시 읽어서 재시도한다.
async function update(mutate) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { items, etag } = await load();
    const next = mutate(items);
    try {
      await save(next, etag);
      return next;
    } catch (err) {
      if (!(err instanceof BlobPreconditionFailedError)) throw err;
    }
  }
  throw new Error('conflict');
}

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);

const publicView = ({ id, name, body, createdAt }) => ({ id, name, body, createdAt });

export async function GET() {
  if (!storeReady()) return json({ error: 'not_configured' }, 503);
  try {
    const { items } = await load();
    const comments = items.map(publicView).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ comments }, 200, { 'cache-control': 'public, s-maxage=10, stale-while-revalidate=60' });
  } catch {
    return json({ error: 'load_failed' }, 500);
  }
}

export async function POST(request) {
  if (!storeReady()) return json({ error: 'not_configured' }, 503);

  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return json({ error: 'forbidden' }, 403);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // 숨은 입력칸(website)이 채워졌거나 너무 빨리 제출되면 조용히 성공한 척한다.
  const filledTooFast = !Number.isFinite(input.t) || Date.now() - input.t < MIN_FILL_MS;
  if (input.website || filledTooFast) return json({ comment: null }, 201);

  const name = clean(input.name, LIMITS.name);
  const body = clean(input.body, LIMITS.body);
  if (!name) return json({ error: 'name_required' }, 422);
  if (body.length < 2) return json({ error: 'body_required' }, 422);

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const now = Date.now();
  if (ip && now - (lastPostByIp.get(ip) || 0) < COOLDOWN_MS) return json({ error: 'too_fast' }, 429);

  const comment = {
    id: `${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name,
    body,
    createdAt: new Date(now).toISOString(),
  };

  try {
    await update((items) => [...items, comment].slice(-LIMITS.total));
  } catch {
    return json({ error: 'save_failed' }, 500);
  }
  if (ip) lastPostByIp.set(ip, now);
  return json({ comment: publicView(comment) }, 201);
}

// 관리자 삭제: DELETE /api/comments?id=... (헤더 x-admin-key = COMMENTS_ADMIN_KEY)
export async function DELETE(request) {
  const key = process.env.COMMENTS_ADMIN_KEY;
  if (!key || request.headers.get('x-admin-key') !== key) return json({ error: 'forbidden' }, 403);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'bad_request' }, 400);
  try {
    await update((items) => items.filter((c) => c.id !== id));
    return json({ ok: true });
  } catch {
    return json({ error: 'save_failed' }, 500);
  }
}
