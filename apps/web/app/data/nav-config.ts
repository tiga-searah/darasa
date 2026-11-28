import type { LucideIcon } from "lucide-react";

export interface NavItem {
	to: string;
	label: string;
	mobileLabel?: string;
	icon: LucideIcon;
	badge?: string;
}

export const ROLE_LABELS: Record<string, string> = {
	visitor: "Pengunjung",
	user: "Warga Terdaftar",
	owner: "Pemilik Usaha",
	admin: "Administrator",
};

export const SHORT_ROLE_LABELS: Record<string, string> = {
	visitor: "Tamu",
	user: "Warga",
	owner: "Pemilik",
	admin: "Admin",
};

export const GITHUB_REPO_URL = "https://github.com/tiga-searah/darasa";
