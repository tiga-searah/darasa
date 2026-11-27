import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useDarasa } from "~/context/darasa-store";

export function useContributePlaceSelection(basePath: string) {
	const { hydrated, places } = useDarasa();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const placeIdParam = searchParams.get("placeId") ?? "";
	const [selectedPlaceId, setSelectedPlaceId] = useState<string>(placeIdParam);

	useEffect(() => {
		if (placeIdParam) {
			setSelectedPlaceId(placeIdParam);
		}
	}, [placeIdParam]);

	useEffect(() => {
		if (!hydrated) return;
		if (places.length === 0) {
			if (selectedPlaceId !== "") setSelectedPlaceId("");
			return;
		}
		if (!places.some((p) => p.id === selectedPlaceId)) {
			setSelectedPlaceId(places[0].id);
		}
	}, [hydrated, places, selectedPlaceId]);

	const effectivePlaceId =
		places.find((p) => p.id === selectedPlaceId)?.id ?? places[0]?.id ?? "";

	const handleRequestAddNewPlace = useCallback(
		(prefillName: string) => {
			const trimmed = prefillName.trim();
			navigate(
				trimmed
					? `/contribute/add-place?name=${encodeURIComponent(trimmed)}`
					: "/contribute/add-place",
			);
		},
		[navigate],
	);

	const redirectSearch = searchParams.toString();
	const redirectPath = redirectSearch
		? `${basePath}?${redirectSearch}`
		: basePath;

	return {
		places,
		searchParams,
		selectedPlaceId: effectivePlaceId,
		setSelectedPlaceId,
		handleRequestAddNewPlace,
		redirectPath,
	};
}
