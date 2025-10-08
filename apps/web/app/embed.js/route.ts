import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const js = `
  (function(){
    try {
      var s = document.currentScript;
      if (!s) return;
      var d = s.dataset || {};
      // Preferred: data-url (full URL), fallback: data-token
      var url = d.url || '';
      if (!url) {
        var origin = (d.origin || (location.origin || '')).replace(/\\/$/, '');
        var basePath = d.basepath || ''; // e.g. "/mindcanvas" in prod
        var token = d.token || '';
        if (!token) { console.warn('[mindcanvas-embed] missing data-url or data-token'); return; }
        url = origin + basePath + '/t/' + token;
      }

      var container = null;
      if (d.target) {
        container = document.querySelector(d.target);
      }
      if (!container) {
        container = document.createElement('div');
        document.body.appendChild(container);
      }

      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = d.width || '100%';
      iframe.style.height = d.height || '700px';
      iframe.style.border = '0';
      iframe.allow = 'clipboard-write;';

      container.appendChild(iframe);
    } catch (e) {
      console.error('[mindcanvas-embed]', e);
    }
  })();
  `;
  return new NextResponse(js, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}
