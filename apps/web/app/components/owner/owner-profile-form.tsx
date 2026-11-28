import { CheckCircle2, Save } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import {
	parseOpeningHoursValue,
	parsePriceRangeValue,
	toEditableOpeningHours,
	toEditablePriceRange,
} from "~/components/contribute/add-place-validation";
import {
	OpeningHoursField,
	PriceRangeField,
} from "~/components/place-schedule-price-fields";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { WhatsappInputField } from "~/components/whatsapp-input-field";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import {
	formatWhatsappAfter62,
	toStoredWhatsappNumber,
	validateWhatsappNumber,
} from "~/lib/whatsapp";

interface OwnerProfileFormProps {
	place: PlaceWithMetrics;
	onSave: (updates: {
		name: string;
		address: string;
		openingHours: string;
		priceRange: string;
		phone: string;
		description: string;
	}) => void;
}

export function OwnerProfileForm({ place, onSave }: OwnerProfileFormProps) {
	const [name, setName] = useState(place.name);
	const [address, setAddress] = useState(place.address);
	const [openingHours, setOpeningHours] = useState(() =>
		toEditableOpeningHours(place.openingHours),
	);
	const [hoursError, setHoursError] = useState<string | null>(null);
	const [priceRange, setPriceRange] = useState(() =>
		toEditablePriceRange(place.priceRange),
	);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [phoneSuffix, setPhoneSuffix] = useState(() =>
		formatWhatsappAfter62(place.phone ?? ""),
	);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [description, setDescription] = useState(place.description);
	const [formError, setFormError] = useState<string | null>(null);
	const [savedNotice, setSavedNotice] = useState<string | null>(null);

	const nameId = useId();
	const addrId = useId();
	const hoursId = useId();
	const priceId = useId();
	const phoneId = useId();
	const descId = useId();

	useEffect(() => {
		setName(place.name);
		setAddress(place.address);
		setOpeningHours(toEditableOpeningHours(place.openingHours));
		setHoursError(null);
		setPriceRange(toEditablePriceRange(place.priceRange));
		setPriceError(null);
		setPhoneSuffix(formatWhatsappAfter62(place.phone ?? ""));
		setPhoneError(null);
		setDescription(place.description);
		setFormError(null);
	}, [place]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (name.trim().length < 3) {
			setFormError("Nama usaha minimal 3 karakter.");
			return;
		}
		if (address.trim().length < 6) {
			setFormError("Alamat usaha minimal 6 karakter.");
			return;
		}
		const hoursCheck = parseOpeningHoursValue(openingHours);
		if (hoursCheck.error) {
			setHoursError(hoursCheck.error);
			setFormError(hoursCheck.error);
			return;
		}
		const priceCheck = parsePriceRangeValue(priceRange);
		if (priceCheck.error) {
			setPriceError(priceCheck.error);
			setFormError(priceCheck.error);
			return;
		}

		const storedPhone = toStoredWhatsappNumber(phoneSuffix);
		if (storedPhone) {
			const waCheck = validateWhatsappNumber(storedPhone);
			if (!waCheck.valid) {
				const message =
					waCheck.error ?? "Masukkan nomor WhatsApp aktif yang valid.";
				setPhoneError(message);
				setFormError(message);
				return;
			}
		}

		setFormError(null);
		setHoursError(null);
		setPriceError(null);
		setPhoneError(null);
		onSave({
			name: name.trim(),
			address: address.trim(),
			openingHours: hoursCheck.formatted,
			priceRange: priceCheck.formatted,
			phone: storedPhone,
			description: description.trim(),
		});
		setSavedNotice("Informasi profil usaha berhasil diperbarui.");
	};

	return (
		<section className="lg:col-span-5 space-y-4">
			<h2 className="text-lg font-bold text-foreground">
				Perbarui Informasi Usaha
			</h2>

			{savedNotice ? (
				<div
					role="status"
					className="flex items-center gap-2 rounded-[8px] border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-xs font-semibold text-primary-hover"
				>
					<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
					{savedNotice}
				</div>
			) : null}

			{formError ? (
				<div
					role="alert"
					className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-3.5 py-2.5 text-xs font-medium text-red-text"
				>
					{formError}
				</div>
			) : null}

			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor={nameId}>Nama usaha</Label>
					<Input
						id={nameId}
						type="text"
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor={addrId}>Alamat usaha</Label>
					<Input
						id={addrId}
						type="text"
						required
						value={address}
						onChange={(e) => setAddress(e.target.value)}
					/>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<OpeningHoursField
						id={hoursId}
						label="Jam buka"
						required
						value={openingHours}
						error={hoursError}
						onChange={(nextValue, nextError) => {
							setOpeningHours(nextValue);
							setHoursError(nextError ?? null);
							if (formError) setFormError(null);
						}}
						onBlurError={setHoursError}
					/>

					<PriceRangeField
						id={priceId}
						label="Kisaran harga"
						required
						value={priceRange}
						error={priceError}
						onChange={(nextValue) => {
							setPriceRange(nextValue);
							setPriceError(null);
							if (formError) setFormError(null);
						}}
						onBlurError={setPriceError}
					/>
				</div>

				<WhatsappInputField
					id={phoneId}
					label="Nomor kontak / WhatsApp"
					value={phoneSuffix}
					error={phoneError}
					onChange={(formatted, typingErr) => {
						setPhoneSuffix(formatted);
						setPhoneError(typingErr);
						if (formError) setFormError(null);
					}}
					onBlurError={setPhoneError}
				/>

				<div className="space-y-1.5">
					<Label htmlFor={descId}>Deskripsi usaha</Label>
					<Textarea
						id={descId}
						rows={3}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>

				<Button type="submit" className="w-full">
					<Save className="size-4" aria-hidden="true" />
					Simpan Perubahan Profil
				</Button>
			</form>
		</section>
	);
}
