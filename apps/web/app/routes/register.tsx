import { Eye, EyeOff, UserPlus } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { useDarasa } from "~/context/darasa-store";
import type { Route } from "./+types/register";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Daftar Akun | Darasa" },
		{
			name: "description",
			content:
				"Buat akun Darasa untuk berkontribusi menambahkan tempat makan dan ulasan di Batang.",
		},
	];
}

export default function RegisterPage() {
	const { registerAccount } = useDarasa();
	const navigate = useNavigate();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const hintId = useId();
	const errorId = useId();

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const res = registerAccount(name, email, password);
		if (!res.ok) {
			setErrorMsg(res.error);
			return;
		}
		setErrorMsg(null);
		navigate("/");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-2xl font-bold">
					<h1>Buat Akun Darasa</h1>
				</CardTitle>
				<CardDescription>
					Daftar sebagai kontributor komunitas kuliner Kabupaten Batang.
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
						<Label htmlFor={nameId}>Nama lengkap</Label>
						<Input
							id={nameId}
							name="name"
							type="text"
							autoComplete="name"
							required
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (errorMsg) setErrorMsg(null);
							}}
							aria-invalid={Boolean(errorMsg)}
							placeholder="Nama lengkap Anda"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={emailId}>Alamat email</Label>
						<Input
							id={emailId}
							name="email"
							type="email"
							autoComplete="email"
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
							placeholder="nama@email.com"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={passwordId}>Kata sandi</Label>
						<p id={hintId} className="text-xs text-muted-foreground">
							Minimal 6 karakter.
						</p>
						<div className="relative">
							<Input
								id={passwordId}
								name="password"
								type={showPassword ? "text" : "password"}
								autoComplete="new-password"
								minLength={6}
								required
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									if (errorMsg) setErrorMsg(null);
								}}
								aria-invalid={Boolean(errorMsg)}
								aria-describedby={hintId}
								placeholder="Buat kata sandi"
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
						<UserPlus className="size-4" aria-hidden="true" />
						Buat Akun Baru
					</Button>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Sudah punya akun?{" "}
					<Link
						to="/login"
						className="font-semibold text-primary hover:underline"
					>
						Masuk di sini
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
