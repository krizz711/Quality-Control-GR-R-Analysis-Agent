const BACKEND_URL = process.env.API_URL || 'http://localhost:8000';
const API_AUTH_KEY = process.env.API_AUTH_KEY || '';

function getTargetUrl(pathSegments: string[] | undefined, search: string) {
  const path = `/${(pathSegments || []).map(encodeURIComponent).join('/')}`;
  return new URL(`${path}${search}`, BACKEND_URL);
}

async function proxyRequest(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  const targetUrl = getTargetUrl(params.path, new URL(request.url).search);
  const method = request.method.toUpperCase();
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection');

  if (API_AUTH_KEY) {
    headers.set('x-api-key', API_AUTH_KEY);
  }

  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;