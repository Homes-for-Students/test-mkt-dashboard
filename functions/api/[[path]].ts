// Cloudflare Pages Function Proxy
// This script intercepts all requests to /api/* and forwards them to your VPS backend.
// This avoids CORS issues and allows your frontend to be fully static.

export const onRequest: PagesFunction<{
  BACKEND_URL: string; // Set this environment variable in Cloudflare Pages Dashboard
}> = async (context) => {
  const { request, env, params } = context;

  // The backend URL where your Node.js Express server is running (e.g. "https://api.myvps.com")
  const backendUrl = env.BACKEND_URL;

  if (!backendUrl) {
    return new Response("BACKEND_URL environment variable is not set.", { status: 500 });
  }

  const url = new URL(request.url);
  const backend = new URL(backendUrl);

  // Rewrite the URL to point to the backend
  url.protocol = backend.protocol;
  url.hostname = backend.hostname;
  url.port = backend.port;
  
  // Forward the request to the backend
  return fetch(url.toString(), request);
};
