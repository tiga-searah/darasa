import { type FormEvent, useId, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useDarasa } from "~/context/darasa-store";
import { DEMO_ACCOUNTS } from "~/data/batang-places";
import { ROLE_LABELS } from "~/data/nav-config";

const API_BASE_URL =
	(import.meta.env.VITE_API_URL as string | undefined)?.trim() || "";

function GoogleMark() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="18"
			height="18"
			aria-hidden="true"
			className="size-4.5 shrink-0"
		>
			<path
				fill="#4285F4"
				d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
			/>
			<path
				fill="#34A853"
				d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
			/>
			<path
				fill="#FBBC05"
				d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
			/>
			<path
				fill="#EA4335"
				d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
			/>
		</svg>
	);
}

interface GoogleAuthButtonProps {
	redirectTo: string;
	mode: "login" | "register";
}

export function GoogleAuthButton({ redirectTo, mode }: GoogleAuthButtonProps) {
	const { loginWithGoogle } = useDarasa();
	const navigate = useNavigate();
	const [chooserOpen, setChooserOpen] = useState(false);
	const [customName, setCustomName] = useState("");
	const [customEmail, setCustomEmail] = useState("");
	const [customError, setCustomError] = useState<string | null>(null);
	const nameId = useId();
	const emailId = useId();

	const handleClick = () => {
		if (API_BASE_URL) {
			const base = API_BASE_URL.replace(/\/$/, "");
			window.location.assign(
				`${base}/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`,
			);
			return;
		}
		setChooserOpen(true);
	};

	const handleSelectDemoGoogle = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
		loginWithGoogle({
			accountId: acc.id,
			name: acc.name,
			email: acc.email,
		});
		setChooserOpen(false);
		navigate(redirectTo);
	};

	const handleCustomGoogleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const cleanEmail = customEmail.trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
			setCustomError("Masukkan alamat email Google yang valid.");
			return;
		}
		loginWithGoogle({
			name: customName.trim() || cleanEmail.split("@")[0] || "Pengguna Google",
			email: cleanEmail,
		});
		setCustomError(null);
		setChooserOpen(false);
		navigate(redirectTo);
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="lg"
				onClick={handleClick}
				className="w-full"
			>
				<GoogleMark />
				<span>Google</span>
			</Button>

			<Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<GoogleMark />
							<span>
								{mode === "register"
									? "Daftar dengan Google"
									: "Masuk dengan Google"}
							</span>
						</DialogTitle>
						<DialogDescription>
							Pilih akun Google untuk melanjutkan ke Darasa.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-2">
							{DEMO_ACCOUNTS.filter((acc) => acc.role !== "visitor").map(
								(acc) => (
									<button
										key={acc.id}
										type="button"
										onClick={() => handleSelectDemoGoogle(acc)}
										className="flex min-h-[48px] items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3.5 py-2 text-left transition-colors hover:border-primary hover:bg-secondary/60"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-foreground">
												{acc.name}
											</p>
											<p className="truncate text-xs text-muted-foreground">
												{acc.email}
											</p>
										</div>
										<Badge variant="outline" className="shrink-0">
											{ROLE_LABELS[acc.role] ?? acc.role}
										</Badge>
									</button>
								),
							)}
						</div>

						<Separator />

						<form onSubmit={handleCustomGoogleSubmit} className="space-y-3">
							<p className="text-xs font-semibold text-muted-foreground">
								Atau gunakan akun Google lain
							</p>
							{customError ? (
								<p role="alert" className="text-xs font-medium text-red-text">
									{customError}
								</p>
							) : null}
							<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
								<div className="space-y-1">
									<Label htmlFor={nameId} className="text-xs">
										Nama
									</Label>
									<Input
										id={nameId}
										type="text"
										value={customName}
										onChange={(e) => setCustomName(e.target.value)}
										placeholder="Nama Anda"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor={emailId} className="text-xs">
										Email Google
									</Label>
									<Input
										id={emailId}
										type="email"
										required
										value={customEmail}
										onChange={(e) => {
											setCustomEmail(e.target.value);
											if (customError) setCustomError(null);
										}}
										placeholder="nama@gmail.com"
									/>
								</div>
							</div>
							<Button type="submit" className="w-full">
								Lanjutkan dengan Google
							</Button>
						</form>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
