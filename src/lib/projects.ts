import type { Lang } from '@/i18n/ui';
import { localePath, useTranslations } from '@/i18n/utils';
import { entrySlug, isPublished } from '@/lib/collections';
import { newestFirst } from '@/lib/date';
import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** The projects in one language, newest first. Drafts only show up in development. */
export async function getProjects(lang: Lang): Promise<Project[]> {
  const projects = await getCollection('projects', (project) => isPublished(project, lang));
  return newestFirst(projects, (project) => project.data.date);
}

/** At most 3 projects with `featured: true`, for the home page. */
export async function getFeaturedProjects(lang: Lang): Promise<Project[]> {
  return (await getProjects(lang)).filter((project) => project.data.featured).slice(0, 3);
}

/** getStaticPaths() for the project pages: one page per project, at its slug. */
export async function projectPaths(lang: Lang) {
  return (await getProjects(lang)).map((project) => ({
    params: { slug: entrySlug(project) },
    props: { project },
  }));
}

/** The page of a project in a language: /projects/my-project/ or /en/projects/my-project/. */
export function projectPath(project: Project, lang: Lang): string {
  return localePath(lang, `projects/${entrySlug(project)}`);
}

/** The links a project has (its live site, its code), with their labels in `lang`. */
export function projectLinks(project: Project, lang: Lang): { href: string; label: string }[] {
  const t = useTranslations(lang);
  const { live, repo } = project.data.links;
  return [
    { href: live, label: t('project.live') },
    { href: repo, label: t('project.repo') },
  ].filter((link): link is { href: string; label: string } => link.href !== undefined);
}
