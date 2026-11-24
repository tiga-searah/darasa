import { Eye, EyeOff, LogIn } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { useDarasa } from "~/context/darasa-store";
import { DEMO_ACCOUNTS } from "~/data/batang-places";
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

export default function LoginPage() {
	const { loginWithCredentials, switchDemoAccount } = useDarasa();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirect") || "/";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

	const handleDemoLogin = (userId: string) => {
		switchDemoAccount(userId);
		navigate(redirectTo);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-2xl font-bold">
					<h1>Masuk ke Darasa</h1>
				</CardTitle>
				<CardDescription>
					Gunakan akun Anda untuk mengirim tempat kuliner, menulis ulasan, atau
					mengajukan klaim usaha.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
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
						<Label htmlFor={emailId}>Alamat email</Label>
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
							placeholder="nama@email.com"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={passwordId}>Kata sandi</Label>
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
								placeholder="Minimal 6 karakter"
								className="pr-12"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								aria-pressed={showPassword}
								aria-label={
									showPassword
										? "Sembunyikan kata sandi"
										: "Tampilkan kata sandi"
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
						Masuk Akun
					</Button>
				</form>

				<Separator />

				<div className="space-y-2.5">
					<p className="text-xs font-semibold text-muted-foreground">
						Masuk cepat akun prototipe (untuk uji peran PRD):
					</p>
					<div className="grid grid-cols-1 gap-2">
						{DEMO_ACCOUNTS.filter((acc) => acc.role !== "visitor").map(
							(acc) => (
								<button
									key={acc.id}
									type="button"
									onClick={() => handleDemoLogin(acc.id)}
									className="flex min-h-[42px] items-center justify-between rounded-[8px] border border-border bg-background px-3 text-left text-xs font-medium text-foreground hover:border-primary hover:bg-secondary"
								>
									<span>
										<strong className="font-semibold">{acc.name}</strong> (
										{acc.email})
									</span>
									<Badge variant="outline">{acc.role}</Badge>
								</button>
							),
						)}
					</div>
				</div>

				<p className="text-center text-sm text-muted-foreground">
					Belum memiliki akun?{" "}
					<Link
						to="/register"
						className="font-semibold text-primary hover:underline"
					>
						Daftar di sini
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
