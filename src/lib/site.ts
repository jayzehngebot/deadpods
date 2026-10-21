export const SITE_URL = 'https://deadpods.com';
export const SITE_NAME = 'deadpods';
export const SITE_DESCRIPTION =
	'Great podcasts that have ended, and their best episodes. Tap once and listen.';

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_URL).href;
}
