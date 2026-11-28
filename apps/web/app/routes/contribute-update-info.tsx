import type { MetaArgs } from "react-router";
import { ContributeSubpageShell } from "~/components/contribute/contribute-subpage-shell";
import { UpdateInfoForm } from "~/components/contribute/update-info-form";
import { useContributePlaceSelection } from "~/components/contribute/use-contribute-place";
import { useDarasa } from "~/context/darasa-store";
import { XP_REWARDS } from "~/data/contribute-xp";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Perbarui Info | Darasa" },
		{
			name: "description",
			content:
				"Koreksi alamat, jam buka, kisaran harga, nomor kontak, atau deskripsi tempat kuliner di Kabupaten Batang.",
		},
	];
}

export default function ContributeUpdateInfoPage() {
	const { suggestPlaceUpdate } = useDarasa();
	const {
		places,
		selectedPlaceId,
		setSelectedPlaceId,
		handleRequestAddNewPlace,
		redirectPath,
	} = useContributePlaceSelection("/contribute/update-info");

	return (
		<ContributeSubpageShell
			title="Perbarui Info"
			description="Koreksi alamat, jam buka, kisaran harga, kontak, atau deskripsi tempat kuliner."
			xpReward={XP_REWARDS.edit}
			redirectPath={redirectPath}
		>
			<UpdateInfoForm
				places={places}
				selectedPlaceId={selectedPlaceId}
				onSelectPlace={setSelectedPlaceId}
				onSuggestUpdate={suggestPlaceUpdate}
				onRequestAddNewPlace={handleRequestAddNewPlace}
			/>
		</ContributeSubpageShell>
	);
}
