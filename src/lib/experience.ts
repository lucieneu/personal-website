// Work experience, from src/content/experience.json.
import { newestFirst } from '@/lib/date';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Job = CollectionEntry<'experience'>;

/** Every job, newest first. */
export async function getExperience(): Promise<Job[]> {
  return newestFirst(await getCollection('experience'), (job) => job.data.start);
}
