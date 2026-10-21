export type ShowStatus = 'ended' | 'complete' | 'hiatus' | 'revived';

export interface Episode {
	/** URL segment, unique within the show. */
	slug: string;
	showSlug: string;
	title: string;
	/** Our own one-line pitch for why it's worth hearing. */
	note: string;
	guid: string;
	audioUrl: string;
	/** Same audio without tracking prefixes, tried if the main URL fails. */
	fallbackUrl: string | null;
	durationSec: number | null;
	pubDate: string | null;
	image: string | null;
}

export interface Show {
	slug: string;
	title: string;
	hosts: string;
	network: string;
	years: string;
	status: ShowStatus;
	genre: string;
	feedUrl: string;
	link: string | null;
	blurb: string;
	artwork: string | null;
	episodes: Episode[];
}

export interface Snapshot {
	generatedAt: string;
	shows: Show[];
}

/** Minimal episode info the player needs; includes show fields for display. */
export interface Track {
	id: string;
	title: string;
	showTitle: string;
	showSlug: string;
	episodeSlug: string;
	audioUrl: string;
	fallbackUrl: string | null;
	durationSec: number | null;
	artwork: string | null;
}
