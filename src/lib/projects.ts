import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type Project = CollectionEntry<'projects'>;

// Project ids are '<lang>/<slug>': the subfolder is the language and the file name the slug.
const splitId = (project: Project) => {
  const [lang = '', ...slug] = project.id.split('/');
  return { lang, slug: slug.join('/') };
};

/** The slug of a project, the same in both languages ('nl/my-project' → 'my-project'). */
export function projectSlug(project: Project): string {
  return splitId(project).slug;
}

/**
 * The projects in one language, newest first. Drafts only show up in development.
 * Missing translations are caught after the build by src/integrations/check-translations.ts.
 */
export async function getProjects(lang: Lang): Promise<Project[]> {
  const projects = await getCollection(
    'projects',
    (project) => splitId(project).lang === lang && (import.meta.env.DEV || !project.data.draft),
  );
  return projects.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** At most 3 projects with `featured: true`, for the home page. */
export async function getFeaturedProjects(lang: Lang): Promise<Project[]> {
  return (await getProjects(lang)).filter((project) => project.data.featured).slice(0, 3);
}

/** getStaticPaths() for the project pages: one page per project, at its slug. */
export async function projectPaths(lang: Lang) {
  return (await getProjects(lang)).map((project) => ({
    params: { slug: projectSlug(project) },
    props: { project },
  }));
}
