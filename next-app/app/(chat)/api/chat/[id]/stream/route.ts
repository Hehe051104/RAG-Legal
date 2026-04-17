export const runtime = "edge";

export function GET() {
  return new Response(null, { status: 204 });
}
