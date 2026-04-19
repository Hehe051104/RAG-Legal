export const runtime = 'edge';
export const dynamic = "force-dynamic";

import { createApiProxy } from "@/lib/edge-api-proxy";

const proxy = createApiProxy("/api/document");

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
