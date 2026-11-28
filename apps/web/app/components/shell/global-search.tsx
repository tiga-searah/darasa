import { MapPin, Search, Star } from "lucide-react";
import {
	type FormEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { PlaceWithMetrics } from "~/context/darasa-store";

interface GlobalSearchProps {
	places: PlaceWithMetrics[];
	onApplyExploreKeyword: (keyword: string) => void;
}

export function GlobalSearch({
	places,
	onApplyExploreKeyword,
}: GlobalSearchProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const [globalQuery, setGlobalQuery] = useState("");
	const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
	const boxRef = useRef<HTMLDivElement>(null);
	const inputId = useId();

	const matches = useMemo(() => {
		const q = globalQuery.trim().toLowerCase();
		if (!q) return [];
		return places
			.filter((place) => {
				const haystack =
					`${place.name} ${place.category} ${place.district} ${place.address}`.toLowerCase();
				return haystack.includes(q);
			})
			.slice(0, 5);
	}, [places, globalQuery]);

	useEffect(() => {
		const _path = location.pathname;
		if (_path) setGlobalSearchFocused(false);
	}, [location.pathname]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!boxRef.current?.contains(event.target as Node)) {
				setGlobalSearchFocused(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, []);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onApplyExploreKeyword(globalQuery.trim());
		setGlobalSearchFocused(false);
		if (location.pathname !== "/explore") {
			navigate("/explore");
		}
	};

	const showDropdown = globalSearchFocused && globalQuery.trim().length > 0;

	return (
		<div ref={boxRef} className="relative flex-1 max-w-xs sm:max-w-sm">
			<search>
				<form onSubmit={handleSubmit} className="relative flex items-center">
					<Label htmlFor={inputId} className="sr-only">
						Pencarian global kuliner Batang
					</Label>
					<Input
						id={inputId}
						type="search"
						value={globalQuery}
						onFocus={() => setGlobalSearchFocused(true)}
						onChange={(e) => {
							setGlobalQuery(e.target.value);
							setGlobalSearchFocused(true);
						}}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setGlobalSearchFocused(false);
							}
						}}
						placeholder="Cari warung, menu, atau kawasan..."
						className="h-10 rounded-full border-border bg-background pl-4 pr-10 text-sm"
					/>
					<button
						type="submit"
						aria-label="Cari kuliner secara global"
						title="Cari"
						className="absolute right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<Search className="size-4" aria-hidden="true" />
					</button>
				</form>
			</search>

			{showDropdown ? (
				<section
					aria-label="Hasil pencarian global cepat"
					className="absolute right-0 top-full z-50 mt-2 w-full min-w-[260px] rounded-[12px] border border-border bg-popover p-2 text-popover-foreground shadow-lg"
				>
					{matches.length === 0 ? (
						<p className="px-3 py-2 text-xs text-muted-foreground">
							Tidak ada tempat cocok untuk &ldquo;{globalQuery.trim()}&rdquo;.
						</p>
					) : (
						<ul className="space-y-1">
							{matches.map((place) => (
								<li key={place.id}>
									<Link
										to={`/places/${place.slug}`}
										onClick={() => setGlobalSearchFocused(false)}
										className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
									>
										<div className="min-w-0">
											<p className="truncate text-xs font-semibold text-foreground">
												{place.name}
											</p>
											<p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
												<MapPin
													className="size-3 shrink-0 text-primary"
													aria-hidden="true"
												/>
												<span>{place.district}</span>
												<span>·</span>
												<span>{place.category}</span>
											</p>
										</div>
										<span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-foreground tabular-nums">
											<Star
												className="size-3 fill-accent-yellow text-accent-yellow"
												aria-hidden="true"
											/>
											{place.reviewCount > 0
												? place.averageRating.toFixed(1)
												: "Baru"}
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
					<div className="mt-1.5 border-t border-border pt-1.5">
						<button
							type="button"
							onClick={() => {
								onApplyExploreKeyword(globalQuery.trim());
								setGlobalSearchFocused(false);
								navigate("/explore");
							}}
							className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
						>
							<span>Lihat semua hasil di Jelajah &rarr;</span>
						</button>
					</div>
				</section>
			) : null}
		</div>
	);
}
