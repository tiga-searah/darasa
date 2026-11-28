import { useEffect, useState } from "react";
import { type MetaArgs, useSearchParams } from "react-router";
import {
	type AddPlaceDraft,
	AddPlaceForm,
} from "~/components/contribute/add-place-form";
import { ContributeSubpageShell } from "~/components/contribute/contribute-subpage-shell";
import { useDarasa } from "~/context/darasa-store";
import { DISTRICT_COORDINATES } from "~/data/batang-places";
import { XP_REWARDS } from "~/data/contribute-xp";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Tambah Tempat Kuliner | Darasa" },
		{
			name: "description",
			content:
				"Daftarkan warung, kedai, atau usaha kuliner baru di Kabupaten Batang ke direktori komunitas Darasa.",
		},
	];
}

function createDefaultDraft(prefillName = ""): AddPlaceDraft {
	return {
		name: prefillName,
		category: "Makanan berat",
		district: "Batang Kota",
		address: "",
		lat: String(DISTRICT_COORDINATES["Batang Kota"].lat),
		lng: String(DISTRICT_COORDINATES["Batang Kota"].lng),
		openingHours: "08.00 - 20.00 WIB",
		priceRange: "Rp 12.000 - Rp 25.000",
		description: "",
		photoPreview: "",
	};
}

export default function ContributeAddPlacePage() {
	const { submitPlace } = useDarasa();
	const [searchParams] = useSearchParams();
	const prefillName = searchParams.get("name")?.trim() ?? "";

	const [draft, setDraft] = useState<AddPlaceDraft>(() =>
		createDefaultDraft(prefillName),
	);

	useEffect(() => {
		if (!prefillName) return;
		setDraft((prev) => (prev.name ? prev : { ...prev, name: prefillName }));
	}, [prefillName]);

	const redirectPath = prefillName
		? `/contribute/add-place?name=${encodeURIComponent(prefillName)}`
		: "/contribute/add-place";

	return (
		<ContributeSubpageShell
			title="Tambah Tempat Kuliner"
			description="Daftarkan warung, kedai, atau usaha kuliner baru di Kabupaten Batang ke peta komunitas."
			xpReward={XP_REWARDS.place}
			redirectPath={redirectPath}
		>
			<AddPlaceForm
				draft={draft}
				onChangeDraft={setDraft}
				onSubmitPlace={submitPlace}
				onResetDraft={() => setDraft(createDefaultDraft())}
			/>
		</ContributeSubpageShell>
	);
}
