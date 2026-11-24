import "leaflet/dist/leaflet.css";
import { Crosshair, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
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

	const [engineMode, setEngineMode] = useState<
		"google" | "leaflet" | "loading"
	>(GOOGLE_MAPS_API_KEY ? "loading" : "leaflet");
	const [activeTab, setActiveTab] = useState("picker");
	const initialCoordsRef = useRef({ lat, lng });

	// Initialize either native Google Maps JS API (if key exists) or Leaflet click-to-pin map
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;
		let cancelled = false;
		const initialCenter = initialCoordsRef.current;

		async function initGoogleMaps() {
			if (!GOOGLE_MAPS_API_KEY || !container) return false;
			try {
				await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
				if (cancelled || !window.google?.maps) return false;

				const map = new window.google.maps.Map(container, {
					center: initialCenter,
					zoom: 15,
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
					const nextLat = Number(e.latLng.lat().toFixed(5));
					const nextLng = Number(e.latLng.lng().toFixed(5));
					marker.setPosition({ lat: nextLat, lng: nextLng });
					onPickRef.current(
						nextLat,
						nextLng,
						`Pin ditandai di Google Maps (${nextLat}, ${nextLng}).`,
					);
				});

				marker.addListener("dragend", (e) => {
					if (!e.latLng) return;
					const nextLat = Number(e.latLng.lat().toFixed(5));
					const nextLng = Number(e.latLng.lng().toFixed(5));
					onPickRef.current(
						nextLat,
						nextLng,
						`Pin digeser di Google Maps (${nextLat}, ${nextLng}).`,
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
				zoom: 14,
				zoomControl: true,
			});

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "&copy; OpenStreetMap contributors",
				maxZoom: 19,
			}).addTo(map);

			const pinIcon = L.divIcon({
				className: "darasa-custom-pin",
				html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#16865B;color:#FFFFFF;border:3px solid #FFFFFF;box-shadow:0 6px 14px rgba(23,26,24,0.28);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 32],
			});

			const marker = L.marker([initialCenter.lat, initialCenter.lng], {
				draggable: true,
				icon: pinIcon,
			}).addTo(map);

			map.on("click", (e) => {
				const nextLat = Number(e.latlng.lat.toFixed(5));
				const nextLng = Number(e.latlng.lng.toFixed(5));
				marker.setLatLng([nextLat, nextLng]);
				onPickRef.current(
					nextLat,
					nextLng,
					`Pin lokasi ditandai di peta (${nextLat}, ${nextLng}).`,
				);
			});

			marker.on("dragend", () => {
				const pos = marker.getLatLng();
				const nextLat = Number(pos.lat.toFixed(5));
				const nextLng = Number(pos.lng.toFixed(5));
				onPickRef.current(
					nextLat,
					nextLng,
					`Pin lokasi digeser (${nextLat}, ${nextLng}).`,
				);
			});

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
			if (leafletMapRef.current) {
				leafletMapRef.current.remove();
				leafletMapRef.current = null;
				leafletMarkerRef.current = null;
			}
			googleMapRef.current = null;
			googleMarkerRef.current = null;
		};
	}, []);

	// Keep pin and map center synced when user changes district, pastes Google Maps URL, or clicks GPS
	useEffect(() => {
		if (Number.isNaN(lat) || Number.isNaN(lng)) return;

		if (googleMapRef.current && googleMarkerRef.current) {
			const pos = { lat, lng };
			googleMarkerRef.current.setPosition(pos);
			googleMapRef.current.panTo(pos);
		}

		if (leafletMapRef.current && leafletMarkerRef.current) {
			leafletMarkerRef.current.setLatLng([lat, lng]);
			leafletMapRef.current.panTo([lat, lng], { animate: true });
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

	const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=16&output=embed`;
	const externalUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

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

				<TabsContent value="picker" className="mt-0 space-y-2">
					<div
						ref={mapContainerRef}
						className="relative z-0 h-64 w-full overflow-hidden rounded-[8px] border border-border bg-card"
					/>
					<p className="text-xs text-muted-foreground">
						{engineMode === "google"
							? "Mode Google Maps Platform API aktif. Klik peta atau geser pin merah untuk menandai lokasi."
							: "Klik titik mana saja di peta atau geser pin hijau untuk menandai koordinat lokasi secara presisi."}
					</p>
				</TabsContent>

				<TabsContent value="gmaps" className="mt-0 space-y-2">
					<div className="h-64 w-full overflow-hidden rounded-[8px] border border-border bg-card">
						<iframe
							title="Pratinjau pin lokasi pada Google Maps"
							src={embedUrl}
							width={640}
							height={256}
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
							className="h-full w-full border-0"
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Pratinjau tampilan Google Maps untuk koordinat yang sudah Anda
						tandai (
						<span className="tabular-nums font-medium text-foreground">
							{lat.toFixed(5)}, {lng.toFixed(5)}
						</span>
						).
					</p>
				</TabsContent>
			</Tabs>
		</div>
	);
}
