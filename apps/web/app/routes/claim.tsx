import {
	Award,
	CheckCircle2,
	Clock,
	FileCheck2,
	LogIn,
	XCircle,
} from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	useId,
	useMemo,
	useState,
} from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/claim";

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
	const { places, claims, currentUser, submitClaim } = useDarasa();
	const [searchParams] = useSearchParams();
	const preselectedPlaceId = searchParams.get("placeId") || "";

	const unclaimedPlaces = useMemo(
		() => places.filter((p) => !p.ownerId),
		[places],
	);

	const [selectedPlaceId, setSelectedPlaceId] = useState(
		preselectedPlaceId || unclaimedPlaces[0]?.id || "",
	);
	const [businessRole, setBusinessRole] = useState("Pemilik Usaha");
	const [whatsappNumber, setWhatsappNumber] = useState("");
	const [evidenceSummary, setEvidenceSummary] = useState("");
	const [evidenceFileName, setEvidenceFileName] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

	const placeSelectId = useId();
	const roleInputId = useId();
	const waInputId = useId();
	const evidenceId = useId();
	const fileId = useId();

	const myClaims = useMemo(() => {
		if (currentUser.role === "admin") return claims;
		return claims.filter((c) => c.claimantUserId === currentUser.id);
	}, [claims, currentUser]);

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setEvidenceFileName(file ? file.name : "");
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!selectedPlaceId) {
			setFormError("Pilih profil tempat kuliner yang ingin Anda klaim.");
			return;
		}
		if (whatsappNumber.trim().length < 8) {
			setFormError("Masukkan nomor WhatsApp aktif usaha minimal 8 digit.");
			return;
		}
		if (evidenceSummary.trim().length < 15) {
			setFormError("Jelaskan bukti kepemilikan usaha minimal 15 karakter.");
			return;
		}

		submitClaim({
			placeId: selectedPlaceId,
			businessRole,
			whatsappNumber,
			evidenceSummary,
			evidenceFileName,
		});

		setFormError(null);
		setWhatsappNumber("");
		setEvidenceSummary("");
		setEvidenceFileName("");
		setSubmittedNotice(
			"Pengajuan klaim berhasil dicatat dengan status Menunggu Tinjauan Admin.",
		);
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-foreground">
					Klaim Profil Usaha Kuliner
				</h1>
				<p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
					Pemilik usaha dapat mengajukan klaim atas profil yang sudah
					ditambahkan komunitas. Akses pengelolaan dasbor dibuka setelah
					administrator menyetujui klaim.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<Card className="lg:col-span-7">
					<CardHeader>
						<CardTitle className="text-lg font-bold">
							Formulir Pengajuan Klaim
						</CardTitle>
					</CardHeader>
					<CardContent>
						{currentUser.role === "visitor" ? (
							<div className="rounded-[10px] border border-border bg-background p-6 space-y-3">
								<p className="text-sm font-medium text-foreground">
									Silakan masuk terlebih dahulu untuk mengajukan klaim
									kepemilikan profil usaha.
								</p>
								<Button asChild>
									<Link to="/login?redirect=/claim">
										<LogIn className="size-4" aria-hidden="true" />
										Masuk untuk Mengajukan Klaim
									</Link>
								</Button>
							</div>
						) : (
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
									<Label htmlFor={placeSelectId}>
										Pilih profil tempat yang diklaim
									</Label>
									<Select
										value={selectedPlaceId}
										onValueChange={setSelectedPlaceId}
										disabled={unclaimedPlaces.length === 0}
									>
										<SelectTrigger id={placeSelectId}>
											<SelectValue placeholder="Pilih tempat kuliner" />
										</SelectTrigger>
										<SelectContent>
											{unclaimedPlaces.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name} ({p.district})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
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

									<div className="space-y-1.5">
										<Label htmlFor={waInputId}>
											Nomor WhatsApp aktif usaha
										</Label>
										<Input
											id={waInputId}
											type="tel"
											inputMode="tel"
											required
											value={whatsappNumber}
											onChange={(e) => setWhatsappNumber(e.target.value)}
											placeholder="0812-xxxx-xxxx"
										/>
									</div>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor={evidenceId}>
										Keterangan bukti kepemilikan
									</Label>
									<Textarea
										id={evidenceId}
										rows={3}
										required
										value={evidenceSummary}
										onChange={(e) => setEvidenceSummary(e.target.value)}
										placeholder="Contoh: Foto papan nama warung dari sisi dalam, akun WhatsApp usaha, atau surat keterangan domisili UMKM."
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor={fileId}>
										Lampiran berkas pendukung (opsional)
									</Label>
									<label
										htmlFor={fileId}
										className="flex min-h-[44px] items-center gap-2 rounded-[8px] border border-dashed border-border bg-background px-3.5 text-xs font-medium text-muted-foreground hover:border-primary"
									>
										<FileCheck2
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>
											{evidenceFileName ||
												"Pilih foto warung atau dokumen pendukung"}
										</span>
									</label>
									<input
										id={fileId}
										type="file"
										onChange={handleFileChange}
										className="visually-hidden"
									/>
								</div>

								<Button
									type="submit"
									size="lg"
									disabled={unclaimedPlaces.length === 0}
								>
									<Award className="size-4" aria-hidden="true" />
									Ajukan Klaim Profil Usaha
								</Button>
							</form>
						)}
					</CardContent>
				</Card>

				<Card className="lg:col-span-5">
					<CardHeader>
						<CardTitle className="text-lg font-bold">
							Status Pengajuan Klaim
						</CardTitle>
					</CardHeader>
					<CardContent>
						{myClaims.length === 0 ? (
							<div className="rounded-[10px] border border-border bg-background p-5 text-sm text-muted-foreground">
								Belum ada pengajuan klaim dari akun Anda saat ini.
							</div>
						) : (
							<ul className="space-y-3">
								{myClaims.map((claim) => (
									<li
										key={claim.id}
										className="rounded-[10px] border border-border bg-background p-4 space-y-2"
									>
										<div className="flex items-start justify-between gap-2">
											<p className="text-sm font-semibold text-foreground">
												{claim.placeName}
											</p>
											{claim.status === "approved" ? (
												<Badge variant="default">
													<CheckCircle2
														className="size-3.5"
														aria-hidden="true"
													/>
													Disetujui
												</Badge>
											) : claim.status === "rejected" ? (
												<Badge variant="destructive">
													<XCircle className="size-3.5" aria-hidden="true" />
													Ditolak
												</Badge>
											) : (
												<Badge variant="yellow">
													<Clock className="size-3.5" aria-hidden="true" />
													Menunggu
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground">
											Pengaju: {claim.claimantName} ({claim.businessRole}) · WA{" "}
											{claim.whatsappNumber}
										</p>
										{claim.adminNote ? (
											<p className="rounded-[6px] bg-card px-3 py-2 text-xs text-foreground border border-border">
												Catatan Admin: {claim.adminNote}
											</p>
										) : null}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
