import type { LucideIcon } from "lucide-react";
import { MapPinPlus, MessageSquarePlus, PencilLine } from "lucide-react";
import type { PlaceWithMetrics } from "~/context/darasa-store";
import { XP_REWARDS } from "./contribute-xp";

export {
	CONTRIBUTOR_LEVELS,
	type ContributorLevelInfo,
	type ContributorLevelTier,
	calculateContributorXp,
	getContributorLevel,
	XP_REWARDS,
} from "./contribute-xp";

export type ContributeActionId = "add_place" | "write_review" | "update_info";

export interface ContributeActionMeta {
	id: ContributeActionId;
	to: string;
	label: string;
	shortDesc: string;
	xpReward: number;
	icon: LucideIcon;
}

export const CONTRIBUTE_ACTIONS: ContributeActionMeta[] = [
	{
		id: "add_place",
		to: "/contribute/add-place",
		label: "Tambah Tempat",
		shortDesc: "Daftarkan warung atau kedai baru ke peta",
		xpReward: XP_REWARDS.place,
		icon: MapPinPlus,
	},
	{
		id: "write_review",
		to: "/contribute/write-review",
		label: "Tulis Ulasan",
		shortDesc: "Beri bintang dan ceritakan rasa serta porsi",
		xpReward: XP_REWARDS.review,
		icon: MessageSquarePlus,
	},
	{
		id: "update_info",
		to: "/contribute/update-info",
		label: "Perbarui Info",
		shortDesc: "Koreksi alamat, jam buka, harga, kontak, atau tambah foto",
		xpReward: XP_REWARDS.edit,
		icon: PencilLine,
	},
];

export const RATING_LABELS: Record<number, string> = {
	1: "Kurang",
	2: "Cukup",
	3: "Lumayan",
	4: "Enak",
	5: "Sangat Enak",
};

export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_LEGALITY_DOC_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_LEGALITY_MIME_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Gagal membaca berkas"));
		};
		reader.onerror = () => reject(new Error("Gagal membaca berkas"));
		reader.readAsDataURL(file);
	});
}

export function readImageFiles(
	files: FileList | File[],
): Promise<{ urls: string[]; error: string | null }> {
	const list = Array.from(files);
	if (list.length === 0) {
		return Promise.resolve({ urls: [], error: null });
	}

	const invalidType = list.find((f) => !f.type.startsWith("image/"));
	if (invalidType) {
		return Promise.resolve({
			urls: [],
			error: `Berkas "${invalidType.name}" bukan gambar. Pilih JPG, PNG, atau WebP.`,
		});
	}

	const tooBig = list.find((f) => f.size > MAX_IMAGE_FILE_BYTES);
	if (tooBig) {
		return Promise.resolve({
			urls: [],
			error: `Ukuran "${tooBig.name}" melebihi 5 MB. Pilih foto yang lebih ringan.`,
		});
	}

	return Promise.all(list.map(readFileAsDataUrl))
		.then((urls) => ({ urls, error: null }))
		.catch(() => ({
			urls: [],
			error: "Terjadi kendala saat membaca berkas gambar.",
		}));
}

export async function readLegalityDocumentFile(
	file: File,
): Promise<{ url: string; fileName: string; error: string | null }> {
	const isAcceptedMime = (
		ACCEPTED_LEGALITY_MIME_TYPES as readonly string[]
	).includes(file.type);
	const isAcceptedExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);

	if (!isAcceptedMime && !(file.type === "" && isAcceptedExt)) {
		return {
			url: "",
			fileName: "",
			error: `Format "${file.name}" tidak didukung. Unggah surat legalitas berformat PDF, JPG, PNG, atau WebP.`,
		};
	}

	if (file.size > MAX_LEGALITY_DOC_BYTES) {
		return {
			url: "",
			fileName: "",
			error: `Ukuran "${file.name}" melebihi 10 MB. Kompres atau pilih berkas yang lebih ringan.`,
		};
	}

	try {
		const url = await readFileAsDataUrl(file);
		return { url, fileName: file.name, error: null };
	} catch {
		return {
			url: "",
			fileName: "",
			error: "Terjadi kendala saat membaca berkas surat legalitas.",
		};
	}
}

export function formatRelativeContributionDate(isoDate: string): string {
	const parsed = Date.parse(isoDate);
	if (Number.isNaN(parsed)) return "Baru saja";
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(parsed));
}

export function getPlacePhotoCount(place: PlaceWithMetrics): number {
	return (
		place.photos.filter((src) => !src.endsWith(".svg")).length ||
		place.photos.length
	);
}
