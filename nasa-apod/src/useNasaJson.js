
import { useEffect, useMemo, useState } from "react";

const API_KEY = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, { tries = 3, baseDelay = 800 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();

    // 429/503なら待って再試行（Retry-Afterがあれば尊重）
    if (res.status === 429 || res.status === 503) {
      const ra = res.headers.get("Retry-After");
      // Retry-After が無い 429 の場合は無駄な再試行を避けて即エラー
      if (!ra && res.status === 429) {
        throw new Error("429 Too Many Requests (Retry-After ヘッダーなし)");
      }
      const delay = ra ? Number(ra) * 1000 : baseDelay * 2 ** i; // MDN推奨ヘッダ
      await sleep(delay);
      lastErr = new Error(`${res.status} ${res.statusText}`);
      continue;
    }
    // それ以外は即エラー
    throw new Error(`${res.status} ${res.statusText}`);
  }
  throw lastErr || new Error("Request failed");
}

export function useNasaJson(path, params = {}, ttlSec = 3600) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
  const parsedParams = useMemo(() => JSON.parse(stringifiedParams), [stringifiedParams]);

  useEffect(() => {
    const u = new URL(`https://api.nasa.gov${path}`);
    u.searchParams.set("api_key", API_KEY);
    Object.entries(parsedParams).forEach(([k, v]) => u.searchParams.set(k, v));

    const key = `cache:${u.toString()}`;
    const now = Date.now();

    // 1) 簡易キャッシュ（TTL）
    const cached = localStorage.getItem(key);
    if (cached) {
      const { t, v } = JSON.parse(cached);
      if (now - t < ttlSec * 1000) {
        setData(v); setLoading(false); return;
      }
    }

    // 2) 取得（指数バックオフ）
    (async () => {
      setLoading(true); setErr("");
      try {
        const json = await fetchWithRetry(u.toString());
        setData(json);
        localStorage.setItem(key, JSON.stringify({ t: now, v: json }));
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [path, stringifiedParams, parsedParams, ttlSec]);

  return { data, err, loading };
}
