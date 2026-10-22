import { postsFeed } from '@/lib/rss';
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => postsFeed('en', site);
