import type { MetaArgs } from "react-router";
import { AddPhotoForm } from "~/components/contribute/add-photo-form";
import { ContributeSubpageShell } from "~/components/contribute/contribute-subpage-shell";
import { useContributePlaceSelection } from "~/components/contribute/use-contribute-place";
import { XP_REWARDS } from "~/components/contribute/xp";
import { useDarasa } from "~/context/darasa-store";

export function meta(_args: MetaArgs) {
	return [
		{ title: "Tambah Foto | Darasa" },
		{
			name: "description",
			content:
				"Unggah foto menu, hidangan, daftar harga, atau tampak depan warung kuliner di Kabupaten Batang.",
		},
	];
}

export default function ContributeAddPhotoPage() {
	const { addPlacePhoto } = useDarasa();
	const {
		places,
		selectedPlaceId,
		setSelectedPlaceId,
		handleRequestAddNewPlace,
		redirectPath,
	} = useContributePlaceSelection("/contribute/add-photo");

	return (
		<ContributeSubpageShell
			title="Tambah Foto"
			description="Bagikan foto menu, hidangan, daftar harga, atau tampak depan warung."
			xpReward={XP_REWARDS.photo}
			redirectPath={redirectPath}
		>
			<AddPhotoForm
				places={places}
				selectedPlaceId={selectedPlaceId}
				onSelectPlace={setSelectedPlaceId}
				onAddPhoto={addPlacePhoto}
				onRequestAddNewPlace={handleRequestAddNewPlace}
			/>
		</ContributeSubpageShell>
	);
}
