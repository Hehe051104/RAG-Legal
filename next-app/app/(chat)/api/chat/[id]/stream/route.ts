export const runtime = 'edge';
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204 });
}
