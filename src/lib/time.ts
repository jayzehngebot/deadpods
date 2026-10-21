/** 75 → "1:15", 3725 → "1:02:05". */
export function formatTime(totalSeconds: number | null | undefined): string {
	if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
	const s = Math.floor(totalSeconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = String(s % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** 3725 → "1 hour 2 minutes", for screen readers. */
export function spokenTime(totalSeconds: number | null | undefined): string {
	const s = Math.max(0, Math.floor(totalSeconds ?? 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const parts: string[] = [];
	if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
	if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
	if (!h && (sec || !parts.length)) parts.push(`${sec} second${sec === 1 ? '' : 's'}`);
	return parts.join(' ');
}

/** "45m" / "1h 5m" style length labels for episode lists. */
export function durationLabel(totalSeconds: number | null | undefined): string {
	if (!totalSeconds) return '';
	const m = Math.round(totalSeconds / 60);
	if (m < 60) return `${m} min`;
	return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

/**
 * Parses a shared start time: "754", "12:34", "1:02:03", "12m34s", "1h2m3s".
 * Returns seconds, or null if the value isn't a time.
 */
export function parseTimeParam(value: string | null | undefined): number | null {
	if (!value) return null;
	const v = value.trim().toLowerCase();
	if (/^\d+(\.\d+)?$/.test(v)) return Math.floor(Number(v));
	if (/^\d+(:\d{1,2}){1,2}$/.test(v)) {
		return v.split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
	}
	const m = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
	if (m && (m[1] || m[2] || m[3])) {
		return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
	}
	return null;
}
