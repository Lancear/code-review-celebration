export const config = {
  matcher: ['/auth/:path*', '/api/:path*'],
};

const STATE_LENGTH = 3;
const GITHUB_PAGE_SIZE = 24;

/**
 * 
 * @param {Request} request 
 * @param {import('@vercel/edge').RequestContext} context 
 */
export default async function middleware(request, context) {
  const url = new URL(request.url);

  try {
    if (url.pathname === '/auth/login') {
      const randomNumbers = new Uint8Array({ length: STATE_LENGTH });
      crypto.getRandomValues(randomNumbers);

      const signature = new Uint8Array(await crypto.subtle.sign('hmac', await getSignKey(), randomNumbers));
      const state = btoa(randomNumbers.join('-') + '.' + signature.join('-'));

      const { CLIENT_ID, SCOPE } = process.env;
      return Response.redirect('https://github.com/login/oauth/authorize?scope=' + SCOPE + '&client_id=' + CLIENT_ID + '&state=' + state);
    }
    else if (url.pathname === '/auth/authorize') {
      const stateParts = atob(url.searchParams.get('state')).split('.');
      if (stateParts.length !== 2) return new Response('Unauthorized', { status: 401 });

      const stateNumbers = new Uint8Array(stateParts[0].split('-').map(n => parseInt(n)));
      const stateSignature = new Uint8Array(stateParts[1].split('-').map(n => parseInt(n)));

      const validState = stateNumbers.length === STATE_LENGTH && await crypto.subtle.verify('hmac', await getSignKey(), stateSignature, stateNumbers);
      if (!validState) return new Response('Unauthorized', { status: 401 });
  
      const { SCOPE } = process.env;
      const tokenInfo = await fetchAccessToken(url.searchParams.get('code'));
      if (tokenInfo.scope !== SCOPE) return new Response('Unauthorized', { status: 401 });

      const headers = new Headers();
      url.pathname = '/';
      url.search = '';
      headers.set('Location', url.toString());
      headers.set('Set-Cookie', 'token=' + tokenInfo.access_token + '; SameSite=Strict; Path=/api; Secure; HttpOnly');
      return new Response(null, { headers, status: 302 });
    }
    else if (url.pathname === '/api/check') {
      const token = Boolean(/token=([^,;\s]+)/.exec(request.headers.get('cookie') ?? '')?.[1]);
      return token ? new Response('Ok', { status: 200 }) : new Response('Unauthorized', { status: 401 });
    }
    else if (url.pathname === '/api/orgs') {
      const token = /token=([^,;\s]+)/.exec(request.headers.get('cookie') ?? '')?.[1];

      const user = await fetch('https://api.github.com/user', {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      }).then(res => res.json());

      const res = await fetch(`${user.organizations_url}?per_page=100`, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const orgs = res.ok 
        ? JSON.stringify([{ name: user.login, avatar_url: user.avatar_url, type: user.type }].concat((await res.json()).map(organization => ({ name: organization.login, avatar_url: organization.avatar_url, type: organization.type }))))
        :  "";

      return new Response(orgs, {
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': 'application/json' },
      });
    }
    else if (url.pathname === '/api/repos') {
      const token = /token=([^,;\s]+)/.exec(request.headers.get('cookie') ?? '')?.[1];
      const org = url.searchParams.get('org');
      let reposUrl = `https://api.github.com/orgs/${org}/repos`;

      if (!organization) {
        const user = await fetch('https://api.github.com/user', {
          headers: {
            'authorization': `Bearer ${token}`,
          },
        }).then(res => res.json());

        reposUrl = user.repos_url;
      }

      const res = await fetch(`${reposUrl}?sort=updated&per_page=100&page=1`, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      const repos = res.ok 
        ? JSON.stringify((await res.json()).map(repo => ({ name: repo.name, full_name: repo.full_name })))
        :  "";

      return new Response(repos, {
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': 'application/json' },
      });
    }
    else if (url.pathname === '/api/pulls') {
      const token = /token=([^,;\s]+)/.exec(request.headers.get('cookie') ?? '')?.[1];
      const repo = url.searchParams.get('repo');
      const page = url.searchParams.get('page');

      const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${GITHUB_PAGE_SIZE}&page=${page}`, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      return new Response(await res.arrayBuffer(), {
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': 'application/json' },
      });
    }
    else if (url.pathname === '/api/reviews') {
      const token = /token=([^,;\s]+)/.exec(request.headers.get('cookie') ?? '')?.[1];
      const repo = url.searchParams.get('repo');
      const pr = url.searchParams.get('pr');
      const page = url.searchParams.get('page');

      const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr}/reviews?sort=created&direction=desc&per_page=${GITHUB_PAGE_SIZE}&page=${page}`, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });

      return new Response(await res.arrayBuffer(), {
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  catch (err) {
    console.error(err);
    return new Response('Unauthorized', { status: 401 });
  }
};

function getSignKey() {
  const { SIGN_KEY } = process.env;
  return crypto.subtle.importKey('jwk', { k: SIGN_KEY, kty: 'oct' }, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function fetchAccessToken(code) {
  const { CLIENT_ID, CLIENT_SECRET } = process.env;
  const res = await fetch(
    'https://github.com/login/oauth/access_token?client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&code=' + code, 
    { method: 'POST', headers: { 'Accept': 'application/json' }}
  );

  return res.json();
}
