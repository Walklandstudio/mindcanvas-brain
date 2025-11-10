// apps/web/lib/api.ts
export async function getJSON<T = any>(url: string): Promise<T> {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.ok === false)) {
      const msg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  }
  
  export async function postJSON<T = any>(url: string, payload: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.ok === false)) {
      const msg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  }
    