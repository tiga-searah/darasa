import { Eye, EyeOff, LogIn } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthSplitShell } from "~/components/auth/auth-split-shell";
import { GoogleAuthButton } from "~/components/auth/google-auth-button";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/login";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Masuk Akun | Darasa" },
		{
			name: "description",
			content:
				"Masuk ke akun Darasa untuk menambahkan tempat kuliner, ulasan, atau mengelola profil usaha.",
		},
	];
}

const OAUTH_ERRORS: Record<string, string> = {
	oauth_denied: "Masuk dengan Google dibatalkan.",
	oauth_state: "Sesi verifikasi Google kedaluwarsa. Silakan coba lagi.",
	oauth_exchange: "Gagal menghubungkan akun Google. Silakan coba lagi.",
};

export default function LoginPage() {
	const { loginWithCredentials } = useDarasa();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/";
	const oauthError = searchParams.get("error");

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(
		oauthError
			? (OAUTH_ERRORS[oauthError] ?? "Gagal masuk dengan Google.")
			: null,
	);

	const emailId = useId();
	const passwordId = useId();
	const errorId = useId();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const result = loginWithCredentials(email, password);
		if (!result.ok) {
			setErrorMsg(result.error);
			return;
		}
		setErrorMsg(null);
		navigate(redirectTo);
	};

	return (
		<AuthSplitShell
			title="Selamat Datang Kembali"
			subtitle="Silakan masuk ke akun Darasa Anda"
			imageSrc="/images/auth-login.jpg"
			fallbackImageSrc="/images/megono-1.jpg"
			imageAlt="Hidangan kuliner khas Kabupaten Batang"
			imagePosition="left"
		>
			{errorMsg ? (
				<div
					id={errorId}
					role="alert"
					className="rounded-[8px] border border-secondary-red/40 bg-red-soft px-4 py-3 text-sm font-medium text-red-text"
				>
					{errorMsg}
				</div>
			) : null}

			<form onSubmit={handleSubmit} noValidate className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor={emailId} className="sr-only">
						Alamat email
					</Label>
					<Input
						id={emailId}
						name="email"
						type="email"
						autoComplete="username"
						autoCorrect="off"
						autoCapitalize="none"
						spellCheck={false}
						required
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							if (errorMsg) setErrorMsg(null);
						}}
						aria-invalid={Boolean(errorMsg)}
						aria-describedby={errorMsg ? errorId : undefined}
						placeholder="Alamat email"
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor={passwordId} className="sr-only">
						Kata sandi
					</Label>
					<div className="relative">
						<Input
							id={passwordId}
							name="password"
							type={showPassword ? "text" : "password"}
							autoComplete="current-password"
							required
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								if (errorMsg) setErrorMsg(null);
							}}
							aria-invalid={Boolean(errorMsg)}
							aria-describedby={errorMsg ? errorId : undefined}
							placeholder="Kata sandi"
							className="pr-12"
						/>
						<button
							type="button"
							onClick={() => setShowPassword((prev) => !prev)}
							aria-pressed={showPassword}
							aria-label={
								showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
							}
							className="absolute inset-y-1 right-1 inline-flex w-10 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background hover:text-foreground"
						>
							{showPassword ? (
								<EyeOff className="size-4" aria-hidden="true" />
							) : (
								<Eye className="size-4" aria-hidden="true" />
							)}
						</button>
					</div>
				</div>

				<Button type="submit" size="lg" className="w-full">
					<LogIn className="size-4" aria-hidden="true" />
					Masuk
				</Button>
			</form>

			<div className="space-y-3">
				<div className="relative flex items-center justify-center">
					<span className="h-px flex-1 bg-border" aria-hidden="true" />
					<span className="px-3 text-xs text-muted-foreground">
						Atau masuk dengan
					</span>
					<span className="h-px flex-1 bg-border" aria-hidden="true" />
				</div>

				<GoogleAuthButton redirectTo={redirectTo} mode="login" />
			</div>

			<p className="text-center text-sm text-muted-foreground">
				Belum memiliki akun?{" "}
				<Link
					to={
						redirectTo !== "/"
							? `/register?redirect=${encodeURIComponent(redirectTo)}`
							: "/register"
					}
					className="font-semibold text-primary hover:underline"
				>
					Daftar di sini
				</Link>
			</p>
		</AuthSplitShell>
	);
}
