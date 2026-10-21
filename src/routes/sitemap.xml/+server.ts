import { shows } from '#lib/data/index.js';
import { SITE_URL } from '#lib/site.js';

export const prerender = true;
export const trailingSlash = 'never';

export function GET() {
	const paths = [
		'/',
		'/about/',
		...shows.flatMap((s) => [`/${s.slug}/`, ...s.episodes.map((e) => `/${s.slug}/${e.slug}/`)])
	];
	const body =
		'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		paths.map((p) => `\t<url><loc>${SITE_URL}${p}</loc></url>`).join('\n') +
		'\n</urlset>\n';
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
