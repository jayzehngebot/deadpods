import { error } from '@sveltejs/kit';
import { getShow, shows } from '#lib/data/index.js';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => shows.map((s) => ({ show: s.slug }));

export const load: PageLoad = ({ params }) => {
	const show = getShow(params.show);
	if (!show) error(404, 'Show not found');
	return { show };
};
