import { LocateFixed } from "lucide-react";
import { useId, useState } from "react";
import { GoogleMapPicker } from "~/components/google-map-picker";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DISTRICT_COORDINATES } from "~/data/batang-places";
import type { AddPlaceDraft, AddPlaceErrors } from "./add-place-validation";

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
	const mapsUrlId = useId();
	const latId = useId();
	const lngId = useId();

	const parseGoogleMapsInput = (raw: string) => {
		onMapsLinkInputChange(raw);
		const trimmed = raw.trim();
		if (!trimmed) return;

		const patterns = [
			/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
			/[?&](?:q|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
			/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
			/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,
		];

		for (const regex of patterns) {
			const match = trimmed.match(regex);
			if (match) {
				const nextLat = Number(match[1]).toFixed(4);
				const nextLng = Number(match[2]).toFixed(4);
				onChangeDraft((prev) => ({ ...prev, lat: nextLat, lng: nextLng }));
				onGeoMessageChange(
					"Koordinat berhasil diambil dari tautan Google Maps.",
				);
				return;
			}
		}
	};

	const handleUseCurrentLocation = () => {
		if (!("geolocation" in navigator)) {
			onGeoMessageChange("Browser tidak mendukung fitur lokasi GPS.");
			return;
		}
		setIsLocating(true);
		onGeoMessageChange("Mengambil koordinat lokasi Anda...");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const nextLat = pos.coords.latitude.toFixed(4);
				const nextLng = pos.coords.longitude.toFixed(4);
				onChangeDraft((prev) => ({ ...prev, lat: nextLat, lng: nextLng }));
				onGeoMessageChange("Koordinat GPS berhasil diterapkan ke peta.");
				setIsLocating(false);
			},
			() => {
				onGeoMessageChange(
					"Izin lokasi ditolak atau tidak tersedia. Silakan geser pin langsung di peta.",
				);
				setIsLocating(false);
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
				lat={Number(draft.lat) || DISTRICT_COORDINATES["Batang Kota"].lat}
				lng={Number(draft.lng) || DISTRICT_COORDINATES["Batang Kota"].lng}
				onPickLocation={(nextLat, nextLng, note) => {
					onChangeDraft((prev) => ({
						...prev,
						lat: String(nextLat),
						lng: String(nextLng),
					}));
					if (note) onGeoMessageChange(note);
				}}
			/>

			<div className="space-y-1.5">
				<Label htmlFor={mapsUrlId} className="text-xs text-muted-foreground">
					Tempel tautan Google Maps atau koordinat (opsional)
				</Label>
				<Input
					id={mapsUrlId}
					type="text"
					value={mapsLinkInput}
					onChange={(e) => parseGoogleMapsInput(e.target.value)}
					placeholder="https://maps.google.com/... atau -6.9078, 109.7302"
				/>
			</div>

			{geoMessage ? (
				<p
					role="status"
					className="rounded-[8px] border border-primary/25 bg-primary-soft px-3 py-2 text-xs font-medium text-primary-hover"
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
