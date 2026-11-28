export function formatShortIndonesianDate(
	isoDate: string,
	fallback = "Baru",
): string {
	const parsed = Date.parse(isoDate);
	if (Number.isNaN(parsed)) return fallback;
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(parsed));
}
