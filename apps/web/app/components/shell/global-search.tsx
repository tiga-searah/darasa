import { MapPin, Search, Star, X } from "lucide-react";
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
import { cn } from "~/lib/utils";

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
	const [mobileExpanded, setMobileExpanded] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);
	const boxRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
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
			.slice(0, 6);
	}, [places, globalQuery]);

	useEffect(() => {
		const _path = location.pathname;
		if (_path) {
			setMobileExpanded(false);
			setInputFocused(false);
		}
	}, [location.pathname]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!boxRef.current?.contains(event.target as Node)) {
				setMobileExpanded(false);
				setInputFocused(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, []);

	const openMobileSearch = () => {
		setMobileExpanded(true);
		setInputFocused(true);
		inputRef.current?.focus();
	};

	const closeAll = () => {
		setMobileExpanded(false);
		setInputFocused(false);
		inputRef.current?.blur();
	};

	const navigateToExplore = () => {
		onApplyExploreKeyword(globalQuery.trim());
		closeAll();
		if (location.pathname !== "/explore") {
			navigate("/explore");
		}
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		navigateToExplore();
	};

	const trimmedQuery = globalQuery.trim();
	const hasQuery = trimmedQuery.length > 0;
	const showDropdown = inputFocused && hasQuery;

	return (
		<div
			ref={boxRef}
			className="relative flex flex-1 items-center justify-end sm:max-w-xs md:max-w-sm"
		>
			<search className="flex w-full justify-end">
				<form
					onSubmit={handleSubmit}
					className={cn(
						"relative flex h-10 items-center overflow-hidden rounded-full border transition-[width,background-color,border-color] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none focus-within:border-primary sm:w-full sm:border-border sm:bg-background",
						mobileExpanded
							? "w-full border-primary/60 bg-background"
							: "w-10 border-border bg-card/85 hover:border-primary hover:bg-card",
					)}
				>
					<Label htmlFor={inputId} className="sr-only">
						Pencarian global kuliner Batang
					</Label>
					<Input
						ref={inputRef}
						id={inputId}
						type="search"
						enterKeyHint="search"
						value={globalQuery}
						onFocus={() => setInputFocused(true)}
						onChange={(e) => {
							setGlobalQuery(e.target.value);
							setInputFocused(true);
						}}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								closeAll();
							}
						}}
						placeholder="Cari warung, menu, atau kawasan..."
						className={cn(
							"min-h-0 h-full rounded-none border-0 bg-transparent py-0 text-sm shadow-none transition-opacity duration-200 motion-reduce:transition-none focus:outline-none [&::-webkit-search-cancel-button]:appearance-none sm:pointer-events-auto sm:w-full sm:pl-4 sm:pr-10 sm:opacity-100",
							mobileExpanded
								? "pointer-events-auto w-full pl-4 pr-10 opacity-100"
								: "pointer-events-none w-0 px-0 opacity-0",
						)}
					/>

					{mobileExpanded ? (
						<button
							type="button"
							onClick={closeAll}
							aria-label="Tutup pencarian"
							title="Tutup pencarian"
							className="absolute right-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							onClick={openMobileSearch}
							aria-label="Cari kuliner secara global"
							title="Cari kuliner"
							className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-transform duration-150 active:scale-95 sm:hidden"
						>
							<Search className="size-4.5" aria-hidden="true" />
						</button>
					)}

					<button
						type="submit"
						aria-label="Cari kuliner secara global"
						title="Cari"
						className="absolute right-1.5 hidden size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
					>
						<Search className="size-4" aria-hidden="true" />
					</button>
				</form>
			</search>

			{showDropdown ? (
				<section
					aria-label="Hasil pencarian global cepat"
					className="darasa-search-dropdown fixed inset-x-4 top-[4.25rem] z-50 rounded-[12px] border border-border bg-popover p-2 text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-full sm:min-w-[260px]"
				>
					{matches.length === 0 ? (
						<p className="px-2.5 py-2.5 text-xs text-muted-foreground">
							Tidak ada tempat cocok untuk &ldquo;{trimmedQuery}&rdquo;.
						</p>
					) : (
						<ul className="max-h-[50dvh] space-y-1 overflow-y-auto overscroll-contain">
							{matches.map((place) => (
								<li key={place.id}>
									<Link
										to={`/places/${place.slug}`}
										onClick={closeAll}
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
							onClick={navigateToExplore}
							className="flex min-h-[40px] w-full items-center justify-center rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
						>
							Lihat semua hasil di Jelajah
						</button>
					</div>
				</section>
			) : null}
		</div>
	);
}
