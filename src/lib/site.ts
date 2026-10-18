// Links that appear on every page. Their labels are brand names, so they aren't translated.

export const repoUrl = 'https://github.com/lucieneu/personal-website';

interface SocialLink {
  label: string;
  href: string;
}

// TODO(content): other profiles (LinkedIn, email, …), supplied by the owner.
export const socialLinks: SocialLink[] = [{ label: 'GitHub', href: 'https://github.com/lucieneu' }];
