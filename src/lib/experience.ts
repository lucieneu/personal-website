// Work experience, from src/content/experience.json.
import { getCollection, type CollectionEntry } from 'astro:content';
import { newestFirst } from './date';

export type Job = CollectionEntry<'experience'>;

/** Every job, newest first. */
export async function getExperience(): Promise<Job[]> {
  return newestFirst(await getCollection('experience'), (job) => job.data.start);
}
