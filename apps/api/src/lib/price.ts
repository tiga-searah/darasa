export type PriceTier = "under_25k" | "25k_50k" | "50k_100k" | "over_100k";

export function parsePriceBounds(
	priceRange: string | null | undefined,
): { min: number | null; max: number | null } {
	if (!priceRange) return { min: null, max: null };
	const matches = priceRange.match(/\d[\d.]*(?:\s*(?:rb|ribu|k))?/gi);
	if (!matches || matches.length === 0) return { min: null, max: null };
	const numbers = matches
		.map((raw) => {
			const hasThousandSuffix = /(?:rb|ribu|k)$/i.test(raw.trim());
			const value = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
			if (Number.isNaN(value)) return Number.NaN;
			return hasThousandSuffix && value < 1000 ? value * 1000 : value;
		})
		.filter((n) => !Number.isNaN(n));
	if (numbers.length === 0) return { min: null, max: null };
	return { min: Math.min(...numbers), max: Math.max(...numbers) };
}
