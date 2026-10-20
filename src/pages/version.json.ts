// Which commit this build came from, so CI can wait until a deploy is live before testing it.
// Cloudflare Workers Builds sets WORKERS_CI_COMMIT_SHA; local builds report null.
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  Response.json({ commit: process.env.WORKERS_CI_COMMIT_SHA ?? null });
