import { firebaseAuth } from './firebase';

let installed = false;

export function installAuthenticatedFetch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const url = new URL(requestUrl, window.location.origin);
    const isSameOriginApi = url.origin === window.location.origin && url.pathname.startsWith('/api/');
    const isPublicApi = url.pathname === '/api/line/webhook' || url.pathname === '/api/v1/tts';

    if (!isSameOriginApi || isPublicApi) {
      return nativeFetch(input, init);
    }

    const user = firebaseAuth.currentUser;
    if (!user) return nativeFetch(input, init);

    const token = await user.getIdToken();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);

    return nativeFetch(input, { ...init, headers });
  };
}
