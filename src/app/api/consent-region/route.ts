import { consentRegion } from '@/lib/site-consent';

export async function GET(request: Request) {
  // No query, cookie or browser setting can override Vercel's country decision.
  const region = consentRegion(request.headers, process.env.VERCEL === '1');
  return Response.json(
    { region },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        Vary: 'X-Vercel-IP-Country',
      },
    }
  );
}
