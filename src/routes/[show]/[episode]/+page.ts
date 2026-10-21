import { error } from '@sveltejs/kit';
import { getEpisode, shows } from '#lib/data/index.js';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () =>
	shows.flatMap((s) => s.episodes.map((e) => ({ show: s.slug, episode: e.slug })));

export const load: PageLoad = ({ params }) => {
	const found = getEpisode(params.show, params.episode);
	if (!found) error(404, 'Episode not found');
	return found;
};
