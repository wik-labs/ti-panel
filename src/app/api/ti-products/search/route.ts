import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/ti-oauth';

type CacheEntry = { at: number; data: any };
const MEM_CACHE = new Map<string, CacheEntry>();
const DAY_COUNTER = new Map<string, { day: string; count: number }>();

const TTL_24H = 24 * 60 * 60 * 1000;
const COOLDOWN_4H = 4 * 60 * 60 * 1000;
const DAILY_MAX = 6;

function todayKey() { return new Date().toISOString().slice(0, 10); }
function getCache(key: string) { return MEM_CACHE.get(key) ?? null; }
function setCache(key: string, data: any) { MEM_CACHE.set(key, { at: Date.now(), data }); }
function getDailyCount(bucket: string) {
  const t = todayKey(); const cur = DAY_COUNTER.get(bucket);
  return (!cur || cur.day !== t) ? 0 : cur.count;
}
function incDaily(bucket: string) {
  const t = todayKey(); const cur = DAY_COUNTER.get(bucket);
  if (!cur || cur.day !== t) DAY_COUNTER.set(bucket, { day: t, count: 1 });
  else cur.count += 1;
}

// Minimalna normalizacja PI → lista wariantów OPN
function normalizePIResult(raw: any) {
  // wiele implementacji PI zwraca tablicę w polach products/devices/items lub root
  const list: any[] =
    Array.isArray(raw?.products) ? raw.products :
    Array.isArray(raw?.devices)  ? raw.devices  :
    Array.isArray(raw?.items)    ? raw.items    :
    Array.isArray(raw)           ? raw          :
    raw ? [raw] : [];

  const pickOpn = (x: any) =>
    typeof x === 'string'
      ? x
      : x?.opn || x?.OPN || x?.orderablePartNumber || x?.orderablePN || x?.orderable_part_number;

  return list
    .map((p: any) => {
      const gpn =
        p?.GenericProductIdentifier ||
        p?.genericProductIdentifier ||
        p?.genericPartNumber ||
        p?.deviceName ||
        p?.genericPN || null;

      let opns: string[] = [];
      if (Array.isArray(p?.orderablePartNumbers)) opns = p.orderablePartNumbers.map(pickOpn).filter(Boolean);
      else if (Array.isArray(p?.OrderablePartNumbers)) opns = p.OrderablePartNumbers.map(pickOpn).filter(Boolean);
      else if (Array.isArray(p?.orderable_parts)) opns = p.orderable_parts.map(pickOpn).filter(Boolean);

      const description =
        p?.description || p?.briefDescription || p?.marketingText || p?.summary || null;

      return { genericPartNumber: gpn, orderablePartNumbers: opns, description };
    })
    .filter(x => x.genericPartNumber && x.orderablePartNumbers?.length);
}

// ...importy i utilsy bez zmian...

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gpnRaw = searchParams.get('gpn');
    if (!gpnRaw) return NextResponse.json({ ok:false, error: 'Missing gpn' }, { status: 400 });

    const gpn = gpnRaw.trim().toUpperCase();
    const cacheKey = `gpn:${gpn}`;
    const quotaKey = 'pi-v1-catalog';

    // 1) cache / cooldown / dzienny guard – jak dotąd
    const hit = getCache(cacheKey);
    if (hit && Date.now() - hit.at < TTL_24H)
      return NextResponse.json({ ok:true, data:hit.data, meta:{cached:true} }, { status:200 });
    if (hit && Date.now() - hit.at < COOLDOWN_4H)
      return NextResponse.json({ ok:true, data:hit.data, meta:{cached:true, cooldown:true} }, { status:200 });
    if (getDailyCount(quotaKey) >= DAILY_MAX) {
      if (hit) return NextResponse.json({ ok:true, data:hit.data, meta:{cached:true, stale:true, reason:'daily-max'} }, { status:200 });
      return NextResponse.json({ ok:false, error:'Daily quota reached for PI v1. Try later.' }, { status:429 });
    }

    const token = await getAccessToken();
    if (!token) return NextResponse.json({ ok:false, error:'No TI access token' }, { status:500 });

    // Baza z env; obsłuż .../v1 i .../v1/product-information
    const baseRaw = (process.env.TI_PI_BASE || 'https://transact.ti.com/v1').replace(/\/+$/, '');
    const bases = [baseRaw, /\/product-information$/i.test(baseRaw) ? baseRaw : `${baseRaw}/product-information`];

    // Kanoniczny wariant (1 strzał)
    const primaryQS = `GenericProductIdentifier=${encodeURIComponent(gpn)}&include=orderablePartNumbers,description&Page=1&Size=200`;
    // Fail-over tylko gdy TI powie, że brakuje pola (400)
    const fallbackQS = [
      `GenericProductIdentifier=${encodeURIComponent(gpn)}&include=orderablePartNumbers,description&page=1&size=200`,
      `GenericProductIdentifier=${encodeURIComponent(gpn)}&include=orderablePartNumbers,description&pageNumber=1&pageSize=200`,
    ];

    const attempted: string[] = [];
    let lastStatus = 0, lastText = '', lastJson: any = null;

    // helper do wykonania jednego żądania
    const call = async (base: string, qs: string) => {
      const url = `${base}/products?${qs}`;
      attempted.push(url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
      });
      lastStatus = res.status;
      lastText = await res.text();
      try { lastJson = lastText ? JSON.parse(lastText) : null; } catch {}
      return { res, url };
    };

    // 2) PRÓBA 1: tylko 1 call (primary)
    for (const b of bases) {
      const { res, url } = await call(b, primaryQS);

      if (res.status === 429) {
        if (hit) return NextResponse.json({ ok:true, data:hit.data, meta:{cached:true, stale:true, reason:'ti-rate-limit', attempted} }, { status:200 });
        return NextResponse.json({ ok:false, status:429, error:lastJson ?? lastText ?? 'TI PI v1 rate limit', attempted }, { status:429 });
      }
      if (res.ok) {
        const data = normalizePIResult(lastJson ?? {});
        if (data?.length) {
          incDaily(quotaKey);
          setCache(cacheKey, data);
          return NextResponse.json({ ok:true, data, meta:{cached:false, url} }, { status:200 });
        }
        // 200 ale pusto – spróbuj następnej bazy (drugi base)
        continue;
      }
      if (res.status === 400) {
        // 3) FAIL-OVER: tylko teraz spróbuj alternatyw nazewnictwa
        for (const qs of fallbackQS) {
          const r2 = await call(b, qs);
          if (r2.res.status === 429) {
            if (hit) return NextResponse.json({ ok:true, data:hit.data, meta:{cached:true, stale:true, reason:'ti-rate-limit', attempted} }, { status:200 });
            return NextResponse.json({ ok:false, status:429, error:lastJson ?? lastText ?? 'TI PI v1 rate limit', attempted }, { status:429 });
          }
          if (r2.res.ok) {
            const data = normalizePIResult(lastJson ?? {});
            if (data?.length) {
              incDaily(quotaKey);
              setCache(cacheKey, data);
              return NextResponse.json({ ok:true, data, meta:{cached:false, url:attempted.at(-1)} }, { status:200 });
            }
          }
          // inne statusy – leć dalej/zwróć błąd na końcu
        }
      }
      // 404 / inne – spróbuj następnej bazy
    }

    return NextResponse.json(
      { ok:false, status: lastStatus || 502, error: lastJson ?? lastText ?? 'PI search failed', attempted },
      { status: lastStatus || 502 },
    );
  } catch (e) {
    return NextResponse.json({ ok:false, error: e instanceof Error ? e.message : 'PI handler failed' }, { status:500 });
  }
}
