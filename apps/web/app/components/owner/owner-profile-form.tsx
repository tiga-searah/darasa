import { CheckCircle2, Save } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { PlaceWithMetrics } from "~/context/darasa-store";

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
	const [openingHours, setOpeningHours] = useState(place.openingHours);
	const [priceRange, setPriceRange] = useState(place.priceRange);
	const [phone, setPhone] = useState(place.phone ?? "");
	const [description, setDescription] = useState(place.description);
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
		setOpeningHours(place.openingHours);
		setPriceRange(place.priceRange);
		setPhone(place.phone ?? "");
		setDescription(place.description);
	}, [place]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		onSave({
			name: name.trim(),
			address: address.trim(),
			openingHours: openingHours.trim(),
			priceRange: priceRange.trim(),
			phone: phone.trim(),
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

			<form onSubmit={handleSubmit} className="space-y-4">
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
					<div className="space-y-1.5">
						<Label htmlFor={hoursId}>Jam buka</Label>
						<Input
							id={hoursId}
							type="text"
							value={openingHours}
							onChange={(e) => setOpeningHours(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={priceId}>Kisaran harga</Label>
						<Input
							id={priceId}
							type="text"
							value={priceRange}
							onChange={(e) => setPriceRange(e.target.value)}
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor={phoneId}>Nomor kontak / WhatsApp</Label>
					<Input
						id={phoneId}
						type="tel"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
				</div>

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
