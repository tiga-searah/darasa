import { Loader2, LocateFixed, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GoogleMapPicker } from "~/components/google-map-picker";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DISTRICT_COORDINATES } from "~/data/batang-places";
import { isWithinBatangBounds, parseGoogleMapsCoordinates } from "~/lib/maps";
import type { ResolveMapsLinkResponse } from "~/lib/maps-server";
import { cn } from "~/lib/utils";
import type { AddPlaceDraft, AddPlaceErrors } from "./add-place-validation";

function parseCoordinateOrFallback(raw: string, fallback: number): number {
	const trimmed = raw.trim();
	if (!trimmed || trimmed === "-" || trimmed.endsWith(".")) return fallback;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : fallback;
}

interface AddPlaceLocationSectionProps {
	draft: AddPlaceDraft;
	errors: AddPlaceErrors;
	geoMessage: string | null;
	mapsLinkInput: string;
	onGeoMessageChange: (msg: string | null) => void;
	onMapsLinkInputChange: (val: string) => void;
	onChangeDraft: (updater: (prev: AddPlaceDraft) => AddPlaceDraft) => void;
}

export function AddPlaceLocationSection({
	draft,
	errors,
	geoMessage,
	mapsLinkInput,
	onGeoMessageChange,
	onMapsLinkInputChange,
	onChangeDraft,
}: AddPlaceLocationSectionProps) {
	const [isLocating, setIsLocating] = useState(false);
	const [isResolvingLink, setIsResolvingLink] = useState(false);
	const [geoTone, setGeoTone] = useState<"info" | "error">("info");
	const resolveAbortRef = useRef<AbortController | null>(null);
	const mapsUrlId = useId();
	const latId = useId();
	const lngId = useId();

	useEffect(() => {
		return () => {
			resolveAbortRef.current?.abort();
		};
	}, []);

	const resolveMapsUrlOnServer = async (targetUrl: string) => {
		resolveAbortRef.current?.abort();
		const controller = new AbortController();
		resolveAbortRef.current = controller;
		setIsResolvingLink(true);
		setGeoTone("info");
		onGeoMessageChange("Mengambil koordinat dari tautan Google Maps...");

		try {
			const res = await fetch(
				`/resolve-maps-link?url=${encodeURIComponent(targetUrl)}`,
				{ signal: controller.signal },
			);
			const payload = (await res.json()) as ResolveMapsLinkResponse;
			if (controller.signal.aborted) return;

			if (payload.ok && payload.result) {
				const { lat, lng, inBatangBounds, message } = payload.result;
				onChangeDraft((prev) => ({ ...prev, lat, lng }));
				setGeoTone(inBatangBounds ? "info" : "error");
				onGeoMessageChange(message);
			} else {
				setGeoTone("error");
				onGeoMessageChange(
					payload.error ??
						"Koordinat tidak ditemukan dari tautan Google Maps tersebut.",
				);
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setGeoTone("error");
			onGeoMessageChange(
				"Gagal memproses tautan Google Maps. Periksa koneksi atau tempel koordinatnya langsung.",
			);
		} finally {
			if (resolveAbortRef.current === controller) {
				setIsResolvingLink(false);
			}
		}
	};

	const parseGoogleMapsInput = (raw: string) => {
		resolveAbortRef.current?.abort();
		setIsResolvingLink(false);
		onMapsLinkInputChange(raw);

		if (!raw.trim()) {
			setGeoTone("info");
			onGeoMessageChange(null);
			return;
		}

		const { result, needsServerResolve, resolvedUrlCandidate, warning } =
			parseGoogleMapsCoordinates(raw);

		if (result) {
			onChangeDraft((prev) => ({
				...prev,
				lat: result.lat,
				lng: result.lng,
			}));
			setGeoTone(result.inBatangBounds ? "info" : "error");
			onGeoMessageChange(result.message);
			return;
		}

		if (needsServerResolve && resolvedUrlCandidate) {
			void resolveMapsUrlOnServer(resolvedUrlCandidate);
			return;
		}

		if (warning) {
			setGeoTone("error");
			onGeoMessageChange(warning);
		}
	};

	const handleUseCurrentLocation = () => {
		if (!("geolocation" in navigator)) {
			onGeoMessageChange("Browser tidak mendukung fitur lokasi GPS.");
			return;
		}
		setIsLocating(true);
		onGeoMessageChange("Mengambil koordinat GPS presisi tinggi...");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const rawLat = pos.coords.latitude;
				const rawLng = pos.coords.longitude;
				const nextLat = rawLat.toFixed(6);
				const nextLng = rawLng.toFixed(6);
				const accuracyMeters = Math.round(pos.coords.accuracy);

				onChangeDraft((prev) => ({ ...prev, lat: nextLat, lng: nextLng }));

				if (!isWithinBatangBounds(rawLat, rawLng)) {
					setGeoTone("error");
					onGeoMessageChange(
						`GPS terbaca di luar Kabupaten Batang (${nextLat}, ${nextLng}). Geser pin ke lokasi warung di Batang.`,
					);
				} else if (Number.isFinite(accuracyMeters) && accuracyMeters > 100) {
					setGeoTone("info");
					onGeoMessageChange(
						`Koordinat GPS perkiraan (±${accuracyMeters} m). Perbesar peta dan geser pin tepat ke bangunan usaha.`,
					);
				} else {
					const accuracyLabel = Number.isFinite(accuracyMeters)
						? ` (akurasi ±${accuracyMeters} m)`
						: "";
					setGeoTone("info");
					onGeoMessageChange(
						`Koordinat GPS presisi berhasil diterapkan${accuracyLabel}.`,
					);
				}
				setIsLocating(false);
			},
			() => {
				setGeoTone("error");
				onGeoMessageChange(
					"Izin lokasi ditolak atau sinyal GPS lemah. Cari alamat atau geser pin langsung di peta.",
				);
				setIsLocating(false);
			},
			{
				enableHighAccuracy: true,
				timeout: 12000,
				maximumAge: 0,
			},
		);
	};

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-0.5">
					<h2 className="text-base font-bold text-foreground">
						Pin Lokasi di Peta <span className="text-red-text">*</span>
					</h2>
					<p className="text-xs text-muted-foreground">
						Klik peta atau geser pin ke titik bangunan yang tepat, seperti di
						Google Maps.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					className="min-h-[44px]"
					loading={isLocating}
					onClick={handleUseCurrentLocation}
				>
					<LocateFixed className="size-4" aria-hidden="true" />
					Lokasi Saya
				</Button>
			</div>

			<GoogleMapPicker
				lat={parseCoordinateOrFallback(
					draft.lat,
					DISTRICT_COORDINATES[draft.district].lat,
				)}
				lng={parseCoordinateOrFallback(
					draft.lng,
					DISTRICT_COORDINATES[draft.district].lng,
				)}
				onPickLocation={(nextLat, nextLng, note) => {
					onChangeDraft((prev) => ({
						...prev,
						lat: nextLat.toFixed(6),
						lng: nextLng.toFixed(6),
					}));
					if (note) {
						setGeoTone("info");
						onGeoMessageChange(note);
					}
				}}
			/>

			<div className="space-y-1.5">
				<Label htmlFor={mapsUrlId} className="text-xs text-muted-foreground">
					Tempel tautan Google Maps atau koordinat (opsional)
				</Label>
				<div className="relative">
					<Input
						id={mapsUrlId}
						type="text"
						value={mapsLinkInput}
						onChange={(e) => parseGoogleMapsInput(e.target.value)}
						placeholder="https://maps.app.goo.gl/... atau -6.9078, 109.7302"
						className="pr-11"
					/>
					{isResolvingLink ? (
						<span
							aria-hidden="true"
							className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
						>
							<Loader2 className="size-4 animate-spin" />
						</span>
					) : mapsLinkInput.trim().length > 0 ? (
						<button
							type="button"
							onClick={() => parseGoogleMapsInput("")}
							aria-label="Hapus tautan Google Maps"
							className="absolute right-0.5 top-1/2 inline-flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					) : null}
				</div>
			</div>

			{geoMessage ? (
				<p
					role={geoTone === "error" ? "alert" : "status"}
					className={cn(
						"rounded-[8px] border px-3 py-2 text-xs font-medium",
						geoTone === "error"
							? "border-secondary-red/40 bg-red-soft text-red-text"
							: "border-primary/25 bg-primary-soft text-primary-hover",
					)}
				>
					{geoMessage}
				</p>
			) : null}

			<details open={Boolean(errors.lat || errors.lng)} className="text-xs">
				<summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
					Atur koordinat manual ({draft.lat}, {draft.lng})
				</summary>
				<div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor={latId} className="text-xs text-muted-foreground">
							Latitude <span className="text-red-text">*</span>
						</Label>
						<Input
							id={latId}
							type="text"
							required
							inputMode="decimal"
							value={draft.lat}
							onChange={(e) => {
								const value = e.target.value;
								onChangeDraft((prev) => ({ ...prev, lat: value }));
							}}
							aria-invalid={Boolean(errors.lat)}
							className="tabular-nums"
						/>
						{errors.lat ? (
							<p role="alert" className="text-xs text-red-text">
								{errors.lat}
							</p>
						) : null}
					</div>

					<div className="space-y-1">
						<Label htmlFor={lngId} className="text-xs text-muted-foreground">
							Longitude <span className="text-red-text">*</span>
						</Label>
						<Input
							id={lngId}
							type="text"
							required
							inputMode="decimal"
							value={draft.lng}
							onChange={(e) => {
								const value = e.target.value;
								onChangeDraft((prev) => ({ ...prev, lng: value }));
							}}
							aria-invalid={Boolean(errors.lng)}
							className="tabular-nums"
						/>
						{errors.lng ? (
							<p role="alert" className="text-xs text-red-text">
								{errors.lng}
							</p>
						) : null}
					</div>
				</div>
			</details>
		</section>
	);
}
