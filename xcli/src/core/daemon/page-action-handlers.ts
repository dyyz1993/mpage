import { findSession } from './session-store';

export async function handlePageVerifySlider(name: string, baseUrl: string) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };

  const captchaData = await session.page.evaluate(async (url) => {
    const res = await fetch(url);
    return res.json();
  }, `${baseUrl}/examples/33/slider-captcha`);

  const { captchaId, targetX } = captchaData;

  const result = await session.page.evaluate(
    async ({ cId, tX, verifyUrl }) => {
      const sliderKnob = document.getElementById('slider-knob');
      const sliderBg = document.getElementById('slider-bg');
      if (!sliderKnob || !sliderBg) return { error: 'Elements not found' };

      const currentLeft = parseInt(sliderKnob.style.left || '0', 10);
      const distance = tX - currentLeft;

      const dispatchDrag = (type: string, clientX: number) => {
        const evt = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: clientX,
          clientY: 100,
        });
        sliderKnob.dispatchEvent(evt);
      };

      dispatchDrag('mousedown', sliderBg.getBoundingClientRect().left);
      for (let i = 0; i <= 20; i++) {
        const x = sliderBg.getBoundingClientRect().left + currentLeft + (distance * i) / 20;
        dispatchDrag('mousemove', x);
      }
      dispatchDrag('mouseup', sliderBg.getBoundingClientRect().left + tX);

      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaId: cId, x: tX }),
      }).then((r) => r.json());

      return { ok: verifyRes.success, targetX: tX, verifyResult: verifyRes };
    },
    { cId: captchaId, tX: targetX, verifyUrl: `${baseUrl}/examples/33/verify-slider` }
  );

  return result;
}

export async function handlePageFetch(
  name: string,
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (headers) {
    Object.assign(requestHeaders, headers);
  }

  const fetchOptions: RequestInit = {
    method: method || 'GET',
    headers: requestHeaders,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await session.page.evaluate(
    async ({ u, opts }) => {
      const res = await fetch(u, opts);
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      return {
        status: res.status,
        ok: res.ok,
        contentType,
        data,
      };
    },
    { u: url, opts: fetchOptions }
  );

  return response;
}

export async function handlePageAddCookie(name: string, cookie: any) {
  const session = findSession(name);
  if (!session) return { ok: false, error: 'Session not found' };
  await session.context.addCookies([cookie]);
  return { ok: true, cookie };
}
