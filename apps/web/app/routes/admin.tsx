import {
	BadgeCheck,
	Lock,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { AdminAnomaliesTab } from "~/components/admin/admin-anomalies-tab";
import { AdminClaimsTab } from "~/components/admin/admin-claims-tab";
import { AdminPlacesTab } from "~/components/admin/admin-places-tab";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useDarasa } from "~/context/darasa-store";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/admin";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Verifikasi & Moderasi Admin | Darasa" },
		{
			name: "description",
			content:
				"Tinjau klaim profil usaha, verifikasi data tempat kuliner, dan periksa flag anomali Z-Score di Darasa.",
		},
	];
}

export default function AdminVerificationPage() {
	const {
		currentUser,
		claims,
		places,
		anomalies,
		reviewClaim,
		setPlaceVerification,
		resolveAnomalyFlag,
		switchDemoAccount,
		resetPrototypeData,
	} = useDarasa();

	const [activeTab, setActiveTab] = useState<"claims" | "places" | "anomalies">(
		"claims",
	);

	if (currentUser.role !== "admin") {
		return (
			<div className="mx-auto max-w-2xl py-10 pb-8">
				<section className="rounded-[12px] border border-border bg-card p-6 sm:p-8 text-center space-y-5">
					<span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-soft text-red-text border border-secondary-red/30">
						<Lock className="size-5" aria-hidden="true" />
					</span>
					<div className="space-y-1.5">
						<h1 className="text-xl font-bold text-foreground sm:text-2xl">
							Halaman Khusus Administrator Kurasi
						</h1>
						<p className="mx-auto max-w-md text-sm text-muted-foreground">
							Peninjauan klaim bisnis, verifikasi tempat, dan pemeriksaan
							anomali Z-Score hanya dapat diakses oleh akun administrator.
						</p>
					</div>

					<Button onClick={() => switchDemoAccount("usr-admin")}>
						Masuk sebagai Administrator Prototipe
					</Button>
				</section>
			</div>
		);
	}

	const pendingClaims = claims.filter((c) => c.status === "pending").length;
	const pendingPlaces = places.filter((p) => p.isPendingModeration).length;
	const openAnomalies = anomalies.filter((a) => a.resolution === "open").length;

	return (
		<div className="space-y-6 pb-8">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
				<div className="space-y-1.5">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Pusat Verifikasi &amp; Moderasi Darasa
					</h1>
					<p className="text-sm sm:text-base text-muted-foreground">
						Proses klaim kepemilikan usaha, tetapkan status verifikasi
						komunitas, dan tinjau indikasi anomali rating secara manual.
					</p>
				</div>

				<Button variant="outline" onClick={resetPrototypeData}>
					<RotateCcw className="size-4" aria-hidden="true" />
					Reset Data Prototipe
				</Button>
			</div>

			<div className="grid grid-cols-1 divide-y divide-border border-b border-border pb-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
				<button
					type="button"
					onClick={() => setActiveTab("claims")}
					aria-pressed={activeTab === "claims"}
					className={cn(
						"py-2 sm:py-1 sm:pr-6 text-left transition-colors",
						activeTab === "claims"
							? "text-primary"
							: "text-foreground hover:text-primary",
					)}
				>
					<p className="text-xs font-medium text-muted-foreground">
						Antrean Klaim Usaha
					</p>
					<p className="mt-1 text-2xl font-bold tabular-nums">
						{pendingClaims} menunggu
					</p>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("places")}
					aria-pressed={activeTab === "places"}
					className={cn(
						"py-2 sm:py-1 sm:px-6 text-left transition-colors",
						activeTab === "places"
							? "text-primary"
							: "text-foreground hover:text-primary",
					)}
				>
					<p className="text-xs font-medium text-muted-foreground">
						Moderasi Tempat Baru
					</p>
					<p className="mt-1 text-2xl font-bold tabular-nums">
						{pendingPlaces} belum diperiksa
					</p>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("anomalies")}
					aria-pressed={activeTab === "anomalies"}
					className={cn(
						"py-2 sm:py-1 sm:pl-6 text-left transition-colors",
						activeTab === "anomalies"
							? "text-primary"
							: "text-foreground hover:text-primary",
					)}
				>
					<p className="text-xs font-medium text-muted-foreground">
						Indikasi Anomali Z-Score
					</p>
					<p className="mt-1 text-2xl font-bold tabular-nums">
						{openAnomalies} terbuka
					</p>
				</button>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(val) =>
					setActiveTab(val as "claims" | "places" | "anomalies")
				}
			>
				<TabsList aria-label="Kategori peninjauan admin">
					<TabsTrigger value="claims">
						<ShieldCheck className="size-4" aria-hidden="true" />
						Klaim Profil Usaha ({pendingClaims} menunggu)
					</TabsTrigger>
					<TabsTrigger value="places">
						<BadgeCheck className="size-4" aria-hidden="true" />
						Verifikasi Tempat ({places.length})
					</TabsTrigger>
					<TabsTrigger value="anomalies">
						<ShieldAlert className="size-4" aria-hidden="true" />
						Anomali Z-Score ({openAnomalies} terbuka)
					</TabsTrigger>
				</TabsList>

				<TabsContent value="claims">
					<AdminClaimsTab claims={claims} onReviewClaim={reviewClaim} />
				</TabsContent>

				<TabsContent value="places">
					<AdminPlacesTab
						places={places}
						onSetPlaceVerification={setPlaceVerification}
					/>
				</TabsContent>

				<TabsContent value="anomalies">
					<AdminAnomaliesTab
						anomalies={anomalies}
						onResolveAnomaly={resolveAnomalyFlag}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
