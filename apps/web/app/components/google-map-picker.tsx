import "leaflet/dist/leaflet.css";
import { Crosshair, ExternalLink, MapPin, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface GoogleMapPickerProps {
	lat: number;
	lng: number;
	onPickLocation: (
		nextLat: number,
		nextLng: number,
		sourceNote?: string,
	) => void;
}

interface SearchCandidate {
	placeId: string;
	label: string;
	lat: number;
	lng: number;
}

interface GoogleMapsGlobal {
	maps: {
		Map: new (
			el: HTMLElement,
			opts: {
				center: { lat: number; lng: number };
				zoom: number;
				mapTypeControl?: boolean;
				streetViewControl?: boolean;
			},
		) => {
			setCenter: (pos: { lat: number; lng: number }) => void;
			panTo: (pos: { lat: number; lng: number }) => void;
			getZoom?: () => number;
			setZoom?: (zoom: number) => void;
			addListener: (
				eventName: string,
				handler: (e: {
					latLng?: { lat: () => number; lng: () => number };
				}) => void,
			) => void;
		};
		Marker: new (opts: {
			position: { lat: number; lng: number };
			map: unknown;
			draggable?: boolean;
			title?: string;
		}) => {
			setPosition: (pos: { lat: number; lng: number }) => void;
			addListener: (
				eventName: string,
				handler: (e: {
					latLng?: { lat: () => number; lng: () => number };
				}) => void,
			) => void;
		};
	};
}

declare global {
	interface Window {
		google?: GoogleMapsGlobal;
	}
}

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.google?.maps) return Promise.resolve();
	if (googleMapsScriptPromise) return googleMapsScriptPromise;

	googleMapsScriptPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Gagal memuat Google Maps JS API"));
		document.head.appendChild(script);
	});

	return googleMapsScriptPromise;
}

const GOOGLE_MAPS_API_KEY =
	(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ||
	"";

function coordsMatch(
	a: { lat: number; lng: number } | null,
	bLat: number,
	bLng: number,
): boolean {
	if (!a) return false;
	return Math.abs(a.lat - bLat) < 1e-7 && Math.abs(a.lng - bLng) < 1e-7;
}

async function searchBatangNominatim(
	query: string,
): Promise<SearchCandidate[]> {
	const url = new URL("https://nominatim.openstreetmap.org/search");
	url.searchParams.set("format", "jsonv2");
	url.searchParams.set("countrycodes", "id");
	url.searchParams.set("viewbox", "109.4,-6.5,110.3,-7.5");
	url.searchParams.set("bounded", "1");
	url.searchParams.set("limit", "5");
	url.searchParams.set("q", `${query}, Batang`);

	const res = await fetch(url.toString(), {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) throw new Error("Gagal mencari lokasi");

	const data = (await res.json()) as Array<{
		place_id: number;
		display_name: string;
		lat: string;
		lon: string;
	}>;

	return data
		.map((item) => ({
			placeId: String(item.place_id),
			label: item.display_name,
			lat: Number(Number(item.lat).toFixed(6)),
			lng: Number(Number(item.lon).toFixed(6)),
		}))
		.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

export function GoogleMapPicker({
	lat,
	lng,
	onPickLocation,
}: GoogleMapPickerProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const leafletMapRef = useRef<import("leaflet").Map | null>(null);
	const leafletMarkerRef = useRef<import("leaflet").Marker | null>(null);
	const googleMapRef = useRef<InstanceType<
		GoogleMapsGlobal["maps"]["Map"]
	> | null>(null);
	const googleMarkerRef = useRef<InstanceType<
		GoogleMapsGlobal["maps"]["Marker"]
	> | null>(null);
	const onPickRef = useRef(onPickLocation);
	onPickRef.current = onPickLocation;

	// Track coordinates emitted from inside the map so external updates can zoom cleanly
	const lastEmittedRef = useRef<{ lat: number; lng: number } | null>(null);
	const initialCoordsRef = useRef({ lat, lng });

	const [engineMode, setEngineMode] = useState<
		"google" | "leaflet" | "loading"
	>(GOOGLE_MAPS_API_KEY ? "loading" : "leaflet");
	const [activeTab, setActiveTab] = useState("picker");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);

	// Initialize either native Google Maps JS API (if key exists) or Leaflet click-to-pin map
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;
		let cancelled = false;
		let resizeObserver: ResizeObserver | null = null;
		const initialCenter = initialCoordsRef.current;

		async function initGoogleMaps() {
			if (!GOOGLE_MAPS_API_KEY || !container) return false;
			try {
				await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
				if (cancelled || !window.google?.maps) return false;

				const map = new window.google.maps.Map(container, {
					center: initialCenter,
					zoom: 17,
					mapTypeControl: true,
					streetViewControl: false,
				});
				const marker = new window.google.maps.Marker({
					position: initialCenter,
					map,
					draggable: true,
					title: "Titik lokasi kuliner",
				});

				map.addListener("click", (e) => {
					if (!e.latLng) return;
					const nextLat = Number(e.latLng.lat().toFixed(6));
					const nextLng = Number(e.latLng.lng().toFixed(6));
					lastEmittedRef.current = { lat: nextLat, lng: nextLng };
					marker.setPosition({ lat: nextLat, lng: nextLng });
					onPickRef.current(
						nextLat,
						nextLng,
						`Pin ditandai di Google Maps (${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}).`,
					);
				});

				marker.addListener("dragend", (e) => {
					if (!e.latLng) return;
					const nextLat = Number(e.latLng.lat().toFixed(6));
					const nextLng = Number(e.latLng.lng().toFixed(6));
					lastEmittedRef.current = { lat: nextLat, lng: nextLng };
					onPickRef.current(
						nextLat,
						nextLng,
						`Pin digeser di Google Maps (${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}).`,
					);
				});

				googleMapRef.current = map;
				googleMarkerRef.current = marker;
				setEngineMode("google");
				return true;
			} catch {
				return false;
			}
		}

		async function initLeaflet() {
			if (!container) return;
			const L = (await import("leaflet")).default;
			if (cancelled) return;

			const map = L.map(container, {
				center: [initialCenter.lat, initialCenter.lng],
				zoom: 16,
				zoomControl: true,
			});

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			// Pointed teardrop pin whose bottom tip aligns strictly to [17, 41]
			const pinIcon = L.divIcon({
				className: "darasa-custom-pin",
				html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42" style="display:block;overflow:visible;filter:drop-shadow(0 4px 8px rgba(17,21,19,0.32));"><path d="M17 1C8.716 1 2 7.716 2 16c0 10.65 13.02 22.85 14.37 24.09a.94.94 0 0 0 1.26 0C18.98 38.85 32 26.65 32 16 32 7.716 25.284 1 17 1Z" fill="#16865B" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="17" cy="16" r="5" fill="#FFFFFF"/></svg>`,
				iconSize: [34, 42],
				iconAnchor: [17, 41],
			});

			const marker = L.marker([initialCenter.lat, initialCenter.lng], {
				draggable: true,
				icon: pinIcon,
			}).addTo(map);

			const emitCoords = (rawLat: number, rawLng: number, verb: string) => {
				const nextLat = Number(rawLat.toFixed(6));
				const nextLng = Number(rawLng.toFixed(6));
				lastEmittedRef.current = { lat: nextLat, lng: nextLng };
				onPickRef.current(
					nextLat,
					nextLng,
					`${verb} (${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}).`,
				);
			};

			map.on("click", (e) => {
				marker.setLatLng(e.latlng);
				emitCoords(e.latlng.lat, e.latlng.lng, "Pin lokasi ditandai di peta");
			});

			marker.on("dragend", () => {
				const pos = marker.getLatLng();
				emitCoords(pos.lat, pos.lng, "Pin lokasi digeser");
			});

			map.whenReady(() => {
				map.invalidateSize();
			});

			if (typeof ResizeObserver !== "undefined") {
				resizeObserver = new ResizeObserver(() => {
					map.invalidateSize();
				});
				resizeObserver.observe(container);
			}

			leafletMapRef.current = map;
			leafletMarkerRef.current = marker;
			setEngineMode("leaflet");
		}

		async function setup() {
			const usedGoogle = GOOGLE_MAPS_API_KEY ? await initGoogleMaps() : false;
			if (!usedGoogle && !cancelled) {
				await initLeaflet();
			}
		}

		setup();

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
			if (leafletMapRef.current) {
				leafletMapRef.current.remove();
				leafletMapRef.current = null;
				leafletMarkerRef.current = null;
			}
			googleMapRef.current = null;
			googleMarkerRef.current = null;
		};
	}, []);

	// Sync external coordinate updates (GPS, Google Maps link, address search, district change)
	useEffect(() => {
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

		if (coordsMatch(lastEmittedRef.current, lat, lng)) {
			lastEmittedRef.current = null;
			return;
		}

		if (googleMapRef.current && googleMarkerRef.current) {
			const pos = { lat, lng };
			googleMarkerRef.current.setPosition(pos);
			googleMapRef.current.panTo(pos);
			const currentZoom = googleMapRef.current.getZoom?.() ?? 15;
			if (currentZoom < 17) {
				googleMapRef.current.setZoom?.(17);
			}
		}

		if (leafletMapRef.current && leafletMarkerRef.current) {
			leafletMarkerRef.current.setLatLng([lat, lng]);
			const targetZoom = Math.max(leafletMapRef.current.getZoom(), 17);
			leafletMapRef.current.setView([lat, lng], targetZoom, { animate: true });
		}
	}, [lat, lng]);

	// Trigger resize when returning to picker tab
	useEffect(() => {
		if (activeTab === "picker" && leafletMapRef.current) {
			window.setTimeout(() => {
				leafletMapRef.current?.invalidateSize();
			}, 60);
		}
	}, [activeTab]);

	const handleSearchLocation = async () => {
		const q = searchQuery.trim();
		if (q.length < 3) {
			setSearchError("Masukkan minimal 3 huruf nama jalan, desa, atau tempat.");
			return;
		}

		setIsSearching(true);
		setSearchError(null);
		try {
			const candidates = await searchBatangNominatim(q);
			setSearchResults(candidates);
			if (candidates.length === 0) {
				setSearchError(
					`Lokasi "${q}" tidak ditemukan di peta Batang. Coba nama jalan/kecamatan lain atau geser pin langsung.`,
				);
			}
		} catch {
			setSearchResults([]);
			setSearchError(
				"Pencarian alamat sedang tidak dapat diakses. Klik langsung di peta atau tempel tautan Google Maps.",
			);
		} finally {
			setIsSearching(false);
		}
	};

	const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void handleSearchLocation();
		}
	};

	const selectSearchCandidate = (candidate: SearchCandidate) => {
		setSearchResults([]);
		setSearchError(null);
		onPickLocation(
			candidate.lat,
			candidate.lng,
			`Peta diarahkan ke "${candidate.label.split(",")[0]}". Geser pin tepat ke bangunan usaha.`,
		);
	};

	const latLabel = lat.toFixed(6);
	const lngLabel = lng.toFixed(6);
	const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${latLabel},${lngLabel}`)}&z=17&output=embed`;
	const externalUrl = `https://www.google.com/maps/search/?api=1&query=${latLabel},${lngLabel}`;

	return (
		<div className="space-y-3">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<TabsList className="border-b-0 pb-0">
						<TabsTrigger value="picker" className="min-h-[38px] px-3 text-xs">
							<Crosshair className="size-3.5" aria-hidden="true" />
							Tandai Pin di Peta
						</TabsTrigger>
						<TabsTrigger value="gmaps" className="min-h-[38px] px-3 text-xs">
							<MapPin className="size-3.5" aria-hidden="true" />
							Pratinjau Google Maps
						</TabsTrigger>
					</TabsList>

					<Button asChild variant="outline" size="sm" className="min-h-[38px]">
						<a href={externalUrl} target="_blank" rel="noopener noreferrer">
							Buka di Google Maps
							<ExternalLink className="size-3.5" aria-hidden="true" />
						</a>
					</Button>
				</div>

				<TabsContent value="picker" className="mt-0 space-y-2.5">
					<div className="space-y-1.5">
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search
									className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden="true"
								/>
								<Input
									type="search"
									value={searchQuery}
									onChange={(e) => {
										setSearchQuery(e.target.value);
										if (searchError) setSearchError(null);
									}}
									onKeyDown={handleSearchKeyDown}
									aria-label="Cari jalan, desa, atau patokan di Batang"
									placeholder="Cari jalan, pasar, atau patokan di Batang..."
									className="pl-9"
								/>
							</div>
							<Button
								type="button"
								variant="secondary"
								loading={isSearching}
								onClick={() => void handleSearchLocation()}
							>
								Cari
							</Button>
						</div>

						{searchError ? (
							<p role="alert" className="text-xs font-medium text-red-text">
								{searchError}
							</p>
						) : null}

						{searchResults.length > 0 ? (
							<ul
								aria-label="Hasil pencarian lokasi peta"
								className="divide-y divide-border overflow-hidden rounded-[8px] border border-border bg-card"
							>
								{searchResults.map((item) => (
									<li key={item.placeId}>
										<button
											type="button"
											onClick={() => selectSearchCandidate(item)}
											className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-primary-soft/60"
										>
											<MapPin
												className="mt-0.5 size-3.5 shrink-0 text-primary"
												aria-hidden="true"
											/>
											<span className="line-clamp-2">{item.label}</span>
										</button>
									</li>
								))}
							</ul>
						) : null}
					</div>

					<div
						ref={mapContainerRef}
						className="relative z-0 h-72 sm:h-80 w-full overflow-hidden rounded-[8px] border border-border bg-card"
					/>
					<p className="text-xs text-muted-foreground">
						{engineMode === "google"
							? "Mode Google Maps Platform API aktif. Perbesar peta lalu klik atau geser pin ke bangunan usaha."
							: "Perbesar peta hingga tampak jalan/bangunan, lalu klik atau geser ujung lancip pin tepat di lokasi usaha."}
					</p>
				</TabsContent>

				<TabsContent value="gmaps" className="mt-0 space-y-2">
					<div className="h-72 sm:h-80 w-full overflow-hidden rounded-[8px] border border-border bg-card">
						<iframe
							title="Pratinjau pin lokasi pada Google Maps"
							src={embedUrl}
							width={640}
							height={320}
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
							className="h-full w-full border-0"
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Pratinjau tampilan Google Maps untuk koordinat yang sudah Anda
						tandai (
						<span className="tabular-nums font-medium text-foreground">
							{latLabel}, {lngLabel}
						</span>
						).
					</p>
				</TabsContent>
			</Tabs>
		</div>
	);
}
