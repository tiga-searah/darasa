import {
	AlertTriangle,
	BadgeCheck,
	Check,
	Lock,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { VerificationBadge } from "~/components/verification-badge";
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

	const [claimNotes, setClaimNotes] = useState<Record<string, string>>({});
	const [activeTab, setActiveTab] = useState<"claims" | "places" | "anomalies">(
		"claims",
	);

	if (currentUser.role !== "admin") {
		return (
			<div className="mx-auto max-w-2xl py-10 space-y-5">
				<div className="flex items-center gap-3">
					<span className="flex size-11 items-center justify-center rounded-[10px] bg-red-soft text-red-text border border-secondary-red/30">
						<Lock className="size-5" aria-hidden="true" />
					</span>
					<div>
						<h1 className="text-xl font-bold text-foreground">
							Halaman Khusus Administrator Kurasi
						</h1>
						<p className="text-sm text-muted-foreground">
							Peninjauan klaim bisnis, verifikasi tempat, dan pemeriksaan
							anomali Z-Score hanya dapat diakses oleh akun administrator.
						</p>
					</div>
				</div>

				<Button onClick={() => switchDemoAccount("usr-admin")}>
					Masuk sebagai Administrator Prototipe
				</Button>
			</div>
		);
	}

	const pendingClaims = claims.filter((c) => c.status === "pending").length;
	const pendingPlaces = places.filter((p) => p.isPendingModeration).length;
	const openAnomalies = anomalies.filter((a) => a.resolution === "open").length;

	return (
		<div className="space-y-6">
			{/* Flat Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
				<div className="space-y-1">
					<h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">
						Pusat Verifikasi &amp; Moderasi Darasa
					</h1>
					<p className="text-sm text-muted-foreground">
						Proses klaim kepemilikan usaha, tetapkan status verifikasi
						komunitas, dan tinjau indikasi anomali rating secara manual.
					</p>
				</div>

				<Button variant="outline" onClick={resetPrototypeData}>
					<RotateCcw className="size-4" aria-hidden="true" />
					Reset Data Prototipe
				</Button>
			</div>

			{/* Divided Queue Strip (Cardless) */}
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
					{claims.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							Belum ada pengajuan klaim yang masuk.
						</p>
					) : (
						<ul className="divide-y divide-border">
							{claims.map((claim) => (
								<li key={claim.id} className="py-5 space-y-3.5">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-1">
											<h2 className="text-lg font-semibold text-foreground">
												{claim.placeName}
											</h2>
											<p className="text-xs text-muted-foreground">
												Pengaju:{" "}
												<strong className="text-foreground">
													{claim.claimantName}
												</strong>{" "}
												({claim.claimantEmail}) · {claim.businessRole} · WA{" "}
												{claim.whatsappNumber}
											</p>
										</div>
										<Badge
											variant={
												claim.status === "approved"
													? "default"
													: claim.status === "rejected"
														? "destructive"
														: "yellow"
											}
										>
											{claim.status === "approved"
												? "Disetujui"
												: claim.status === "rejected"
													? "Ditolak"
													: "Menunggu Tinjauan"}
										</Badge>
									</div>

									<p className="border-l-2 border-border pl-3.5 py-0.5 text-sm text-foreground">
										Bukti: {claim.evidenceSummary}
										{claim.evidenceFileName
											? ` (Lampiran: ${claim.evidenceFileName})`
											: ""}
									</p>

									{claim.status === "pending" ? (
										<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
											<label className="sr-only" htmlFor={`note-${claim.id}`}>
												Catatan keputusan untuk {claim.placeName}
											</label>
											<Input
												id={`note-${claim.id}`}
												type="text"
												value={claimNotes[claim.id] ?? ""}
												onChange={(e) =>
													setClaimNotes((prev) => ({
														...prev,
														[claim.id]: e.target.value,
													}))
												}
												placeholder="Catatan keputusan admin (opsional)..."
												className="flex-1"
											/>
											<div className="flex gap-2">
												<Button
													onClick={() =>
														reviewClaim(
															claim.id,
															"approved",
															claimNotes[claim.id],
														)
													}
												>
													<Check className="size-4" aria-hidden="true" />
													Setujui Klaim
												</Button>
												<Button
													variant="destructive"
													onClick={() =>
														reviewClaim(
															claim.id,
															"rejected",
															claimNotes[claim.id],
														)
													}
												>
													<X className="size-4" aria-hidden="true" />
													Tolak
												</Button>
											</div>
										</div>
									) : claim.adminNote ? (
										<p className="text-xs text-muted-foreground">
											Catatan keputusan: {claim.adminNote}
										</p>
									) : null}
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="places">
					<div className="border-t border-border">
						<Table>
							<TableCaption className="sr-only">
								Daftar tempat kuliner dan status verifikasi Darasa
							</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead>Nama Tempat</TableHead>
									<TableHead>Kawasan</TableHead>
									<TableHead>Rating / Ulasan</TableHead>
									<TableHead>Status Saat Ini</TableHead>
									<TableHead className="text-right">
										Tindakan Verifikasi
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{places.map((p) => (
									<TableRow key={p.id}>
										<TableCell>
											<Link
												to={`/places/${p.slug}`}
												className="font-semibold text-foreground hover:text-primary hover:underline"
											>
												{p.name}
											</Link>
											<p className="text-xs text-muted-foreground">
												{p.category}
											</p>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{p.district}
										</TableCell>
										<TableCell className="tabular-nums">
											{p.averageRating.toFixed(1)} ({p.reviewCount})
										</TableCell>
										<TableCell>
											<VerificationBadge
												status={p.verificationStatus}
												isPendingModeration={p.isPendingModeration}
											/>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap justify-end gap-2">
												<Button
													variant="secondary"
													size="sm"
													onClick={() =>
														setPlaceVerification(
															p.id,
															"community_verified",
															true,
														)
													}
												>
													Verifikasi Komunitas
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setPlaceVerification(p.id, "unverified", false)
													}
												>
													Reset
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</TabsContent>

				<TabsContent value="anomalies" className="space-y-4">
					<div className="rounded-[10px] border border-accent-yellow/60 bg-yellow-soft p-4 flex items-start gap-3">
						<AlertTriangle
							className="mt-0.5 size-5 shrink-0 text-yellow-text"
							aria-hidden="true"
						/>
						<p className="text-sm text-yellow-text leading-relaxed">
							<strong>Aturan Peninjauan Manual (FR-036):</strong> Flag Z-Score
							hanya berfungsi sebagai indikasi statistik awal untuk ditinjau
							manual oleh administrator, bukan bukti otomatis kecurangan atau
							pelanggaran.
						</p>
					</div>

					{anomalies.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							Tidak ada aktivitas rating dengan simpangan Z-Score di atas ambang
							saat ini.
						</p>
					) : (
						<ul className="divide-y divide-border border-t border-border">
							{anomalies.map((flag) => (
								<li
									key={flag.id}
									className="py-5 flex flex-wrap items-center justify-between gap-4"
								>
									<div className="space-y-1 max-w-2xl">
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="text-base font-semibold text-foreground">
												{flag.placeName}
											</h2>
											<Badge
												variant={
													flag.resolution === "cleared"
														? "default"
														: flag.resolution === "flagged_hold"
															? "destructive"
															: "yellow"
												}
											>
												{flag.resolution === "cleared"
													? "Dinyatakan Wajar"
													: flag.resolution === "flagged_hold"
														? "Ditandai Perlu Pantauan"
														: "Perlu Tinjauan"}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground tabular-nums">
											{flag.reason}
										</p>
									</div>

									<div className="flex flex-wrap gap-2">
										<Button
											variant="secondary"
											size="sm"
											onClick={() => resolveAnomalyFlag(flag.id, "cleared")}
										>
											Tandai Wajar
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={() =>
												resolveAnomalyFlag(flag.id, "flagged_hold")
											}
										>
											Tahan untuk Pantauan
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
