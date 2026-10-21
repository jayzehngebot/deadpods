import snapshot from './snapshot.json';
import type { Episode, Show, Snapshot, Track } from '../types.js';

const data = snapshot as Snapshot;

export const shows: Show[] = data.shows;
export const generatedAt = data.generatedAt;

export function getShow(slug: string): Show | undefined {
	return shows.find((s) => s.slug === slug);
}

export function getEpisode(showSlug: string, episodeSlug: string) {
	const show = getShow(showSlug);
	const episode = show?.episodes.find((e) => e.slug === episodeSlug);
	return show && episode ? { show, episode } : undefined;
}

export function toTrack(show: Show, episode: Episode): Track {
	return {
		id: `${show.slug}/${episode.slug}`,
		title: episode.title,
		showTitle: show.title,
		showSlug: show.slug,
		episodeSlug: episode.slug,
		audioUrl: episode.audioUrl,
		fallbackUrl: episode.fallbackUrl,
		durationSec: episode.durationSec,
		artwork: episode.image ?? show.artwork
	};
}

export function showTracks(show: Show): Track[] {
	return show.episodes.map((e) => toTrack(show, e));
}

export const allTracks: Track[] = shows.flatMap(showTracks);
