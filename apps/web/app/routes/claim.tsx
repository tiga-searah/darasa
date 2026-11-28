import {
	ArrowLeft,
	Award,
	CheckCircle2,
	Clock,
	Compass,
	LogIn,
	MapPin,
	XCircle,
} from "lucide-react";
import { type FormEvent, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { LegalityDocumentField } from "~/components/legality-document-field";
import { PlacePagination } from "~/components/place-pagination";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { WhatsappInputField } from "~/components/whatsapp-input-field";
import { useDarasa } from "~/context/darasa-store";
import { DEFAULT_PLACES_PAGE_SIZE, paginateItems } from "~/lib/pagination";
import type { ClaimStatus } from "~/lib/types";
import { toStoredWhatsappNumber, validateWhatsappNumber } from "~/lib/whatsapp";
import type { Route } from "./+types/claim";

const CLAIM_STATUS_BADGE: Record<
	ClaimStatus,
	{
		variant: "default" | "destructive" | "yellow";
		icon: typeof CheckCircle2;
		label: string;
	}
> = {
	approved: { variant: "default", icon: CheckCircle2, label: "Disetujui" },
	rejected: { variant: "destructive", icon: XCircle, label: "Ditolak" },
	pending: { variant: "yellow", icon: Clock, label: "Menunggu" },
};

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Klaim Profil Usaha | Darasa" },
		{
			name: "description",
			content:
				"Ajukan klaim kepemilikan profil usaha kuliner di Kabupaten Batang agar dapat mengelola informasi dan membalas ulasan.",
		},
	];
}

export default function ClaimBusinessPage() {
	const { hydrated, places, claims, currentUser, submitClaim } = useDarasa();
	const [searchParams] = useSearchParams();
	const requestedPlaceId = searchParams.get("placeId")?.trim() ?? "";

	const targetPlace = useMemo(
		() =>
			requestedPlaceId
				? places.find(
						(p) => p.id === requestedPlaceId || p.slug === requestedPlaceId,
					)
				: undefined,
		[places, requestedPlaceId],
	);

	const redirectPath = requestedPlaceId
		? `/claim?placeId=${encodeURIComponent(requestedPlaceId)}`
		: "/claim";

	const [businessRole, setBusinessRole] = useState("Pemilik Usaha");
	const [whatsappSuffix, setWhatsappSuffix] = useState("");
	const [whatsappError, setWhatsappError] = useState<string | null>(null);
	const [evidenceSummary, setEvidenceSummary] = useState("");
	const [evidenceFileName, setEvidenceFileName] = useState("");
	const [evidenceFileUrl, setEvidenceFileUrl] = useState("");
	const [fileError, setFileError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);
	const [claimsPage, setClaimsPage] = useState(1);

	const roleInputId = useId();
	const waInputId = useId();
	const evidenceId = useId();
	const fileId = useId();

	const myClaims = useMemo(() => {
		if (currentUser.role === "admin") return claims;
		return claims.filter((c) => c.claimantUserId === currentUser.id);
	}, [claims, currentUser]);

	const claimsPagination = useMemo(
		() => paginateItems(myClaims, claimsPage, DEFAULT_PLACES_PAGE_SIZE),
		[myClaims, claimsPage],
	);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!targetPlace || targetPlace.ownerId) {
			setFormError(
				"Pilih profil tempat kuliner yang belum diklaim dari halaman detail tempat.",
			);
			return;
		}
		const fullWhatsapp = toStoredWhatsappNumber(whatsappSuffix);
		const waCheck = validateWhatsappNumber(fullWhatsapp);
		if (!waCheck.valid) {
			const message =
				waCheck.error ?? "Masukkan nomor WhatsApp aktif yang valid.";
			setWhatsappError(message);
			setFormError(message);
			return;
		}
		if (evidenceSummary.trim().length < 15) {
			setFormError("Jelaskan bukti kepemilikan usaha minimal 15 karakter.");
			return;
		}
		if (!evidenceFileName.trim()) {
			const message =
				"Unggah surat legalitas usaha (NIB, SKU, SIUP, atau surat keterangan usaha) sebagai bukti klaim.";
			setFileError(message);
			setFormError(message);
			return;
		}

		submitClaim({
			placeId: targetPlace.id,
			businessRole,
			whatsappNumber: fullWhatsapp,
			evidenceSummary,
			evidenceFileName,
			evidenceFileUrl,
		});

		setFormError(null);
		setWhatsappError(null);
		setFileError(null);
		setWhatsappSuffix("");
		setEvidenceSummary("");
		setEvidenceFileName("");
		setEvidenceFileUrl("");
		setClaimsPage(1);
		setSubmittedNotice(
			`Pengajuan klaim untuk "${targetPlace.name}" beserta surat legalitas berhasil dicatat dengan status Menunggu Tinjauan Admin.`,
		);
	};

	const renderClaimFormBody = () => {
		if (!hydrated) {
			return (
				<div className="space-y-4" aria-busy="true">
					<div className="h-20 rounded-[10px] bg-muted" />
					<div className="h-11 rounded-[8px] bg-muted" />
					<div className="h-24 rounded-[10px] bg-muted" />
				</div>
			);
		}
		if (currentUser.role === "visitor") {
			return (
				<div className="rounded-[12px] border border-border bg-card p-6 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						Masuk untuk mengajukan klaim usaha.
					</p>
					<Button asChild>
						<Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
							<LogIn className="size-4" aria-hidden="true" />
							Masuk
						</Link>
					</Button>
				</div>
			);
		}
		if (!requestedPlaceId) {
			return (
				<div className="rounded-[12px] border border-dashed border-border bg-card p-6 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						Pilih usaha dari halaman tempatnya terlebih dahulu.
					</p>
					<Button asChild>
						<Link to="/explore">
							<Compass className="size-4" aria-hidden="true" />
							Pilih Usaha di Jelajah
						</Link>
					</Button>
				</div>
			);
		}
		if (!targetPlace) {
			return (
				<div className="rounded-[12px] border border-dashed border-border bg-card p-6 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						Profil usaha tidak ditemukan.
					</p>
					<Button asChild variant="outline">
						<Link to="/explore">
							<Compass className="size-4" aria-hidden="true" />
							Buka Jelajah
						</Link>
					</Button>
				</div>
			);
		}
		if (targetPlace.ownerId) {
			return (
				<div className="rounded-[12px] border border-border bg-card p-6 text-center space-y-3">
					<p className="text-sm font-medium text-foreground">
						&ldquo;{targetPlace.name}&rdquo; sudah diklaim pemiliknya.
					</p>
					<div className="flex flex-wrap justify-center gap-2.5">
						<Button asChild variant="outline">
							<Link to={`/places/${targetPlace.slug}`}>Lihat Profil</Link>
						</Button>
						<Button asChild>
							<Link to="/explore">Cari Usaha Lain</Link>
						</Button>
					</div>
				</div>
			);
		}

		return (
			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				{submittedNotice ? (
					<div
						role="status"
						className="rounded-[8px] border border-primary/30 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-hover"
					>
						{submittedNotice}
					</div>
				) : null}

				{formError ? (
					<div
						role="alert"
						className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
					>
						{formError}
					</div>
				) : null}

				<div className="space-y-1.5">
					<p className="text-sm font-medium text-foreground">
						Profil usaha yang diklaim
					</p>
					<div className="flex items-center gap-2.5 rounded-[8px] border border-primary/40 bg-primary-soft/50 p-2.5">
						<img
							src={targetPlace.photos[0] ?? "/images/megono-batang.svg"}
							alt=""
							width={44}
							height={44}
							className="size-11 shrink-0 rounded-[6px] border border-border object-cover bg-muted"
						/>
						<div className="min-w-0 flex-1 space-y-0.5">
							<p className="truncate text-[13px] font-semibold text-foreground leading-tight">
								{targetPlace.name}
							</p>
							<p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
								<MapPin
									className="size-3 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<span className="truncate">
									{targetPlace.category} · {targetPlace.district}
								</span>
							</p>
							<p className="truncate text-[11px] text-muted-foreground">
								{targetPlace.address}
							</p>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor={roleInputId}>Peran di usaha</Label>
						<Input
							id={roleInputId}
							type="text"
							required
							value={businessRole}
							onChange={(e) => setBusinessRole(e.target.value)}
							placeholder="Pemilik / Pengelola"
						/>
					</div>

					<WhatsappInputField
						id={waInputId}
						label="Nomor WhatsApp aktif usaha"
						required
						value={whatsappSuffix}
						error={whatsappError}
						onChange={(formatted, typingErr) => {
							setWhatsappSuffix(formatted);
							setWhatsappError(typingErr);
							if (formError) setFormError(null);
						}}
						onBlurError={setWhatsappError}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor={evidenceId}>Keterangan bukti kepemilikan</Label>
					<Textarea
						id={evidenceId}
						rows={3}
						required
						value={evidenceSummary}
						onChange={(e) => setEvidenceSummary(e.target.value)}
						placeholder="Contoh: Foto papan nama warung dari sisi dalam, akun WhatsApp usaha, atau surat keterangan domisili UMKM."
					/>
				</div>

				<LegalityDocumentField
					id={fileId}
					label="Surat legalitas usaha"
					required
					helperText="Lampirkan NIB, SKU, SIUP, IUMK, atau surat keterangan usaha sebagai bukti kepemilikan."
					fileName={evidenceFileName}
					fileUrl={evidenceFileUrl}
					error={fileError}
					onChangeFile={(file) => {
						setEvidenceFileName(file?.fileName ?? "");
						setEvidenceFileUrl(file?.fileUrl ?? "");
						if (file) setFormError(null);
					}}
					onError={setFileError}
				/>

				<Button type="submit" size="lg">
					<Award className="size-4" aria-hidden="true" />
					Ajukan Klaim Profil Usaha
				</Button>
			</form>
		);
	};

	return (
		<div className="space-y-6 pb-8">
			<div className="border-b border-border pb-5 space-y-2">
				{targetPlace ? (
					<div>
						<Link
							to={`/places/${targetPlace.slug}`}
							className="inline-flex min-h-[44px] items-center gap-2.5 rounded-[6px] text-base font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
							<span>Kembali</span>
						</Link>
					</div>
				) : null}

				<div className="space-y-1.5">
					<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
						Klaim Profil Usaha
					</h1>
					<p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
						Ajukan kepemilikan profil usaha untuk dikelola setelah disetujui
						admin.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
				<section className="lg:col-span-7 space-y-5">
					<h2 className="text-lg font-bold text-foreground">
						Formulir Pengajuan Klaim
					</h2>

					{renderClaimFormBody()}
				</section>

				<section className="lg:col-span-5 space-y-4">
					<h2 className="text-lg font-bold text-foreground">
						Status Pengajuan Klaim
					</h2>

					{myClaims.length === 0 ? (
						<p className="py-4 text-sm text-muted-foreground">
							Belum ada pengajuan klaim dari akun Anda saat ini.
						</p>
					) : (
						<>
							<ul className="space-y-5">
								{claimsPagination.items.map((claim) => {
									const badgeMeta = CLAIM_STATUS_BADGE[claim.status];
									const StatusIcon = badgeMeta.icon;
									return (
										<li key={claim.id} className="space-y-2.5">
											<div className="flex items-start justify-between gap-2">
												<p className="text-sm font-semibold text-foreground">
													{claim.placeName}
												</p>
												<Badge variant={badgeMeta.variant}>
													<StatusIcon className="size-3.5" aria-hidden="true" />
													{badgeMeta.label}
												</Badge>
											</div>
											<p className="text-xs text-muted-foreground">
												Pengaju: {claim.claimantName} ({claim.businessRole}) ·
												WA {claim.whatsappNumber}
											</p>
											{claim.evidenceFileName ? (
												<p className="text-xs text-muted-foreground">
													Surat legalitas:{" "}
													<span className="font-medium text-foreground">
														{claim.evidenceFileName}
													</span>
												</p>
											) : null}
											{claim.adminNote ? (
												<div className="mt-1.5 rounded-[8px] bg-card px-3 py-2.5 space-y-0.5 dark:bg-muted">
													<p className="text-[11px] font-semibold text-primary-hover">
														Catatan Admin
													</p>
													<p className="text-xs text-muted-foreground leading-relaxed">
														{claim.adminNote}
													</p>
												</div>
											) : null}
										</li>
									);
								})}
							</ul>

							{claimsPagination.totalPages > 1 ? (
								<PlacePagination
									currentPage={claimsPagination.currentPage}
									totalPages={claimsPagination.totalPages}
									totalItems={claimsPagination.totalItems}
									pageSize={claimsPagination.pageSize}
									startItem={claimsPagination.startItem}
									endItem={claimsPagination.endItem}
									onPageChange={setClaimsPage}
									itemLabel="klaim"
								/>
							) : null}
						</>
					)}
				</section>
			</div>
		</div>
	);
}
