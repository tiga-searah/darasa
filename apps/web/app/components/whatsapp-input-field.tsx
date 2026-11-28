import type { ReactNode } from "react";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import {
	formatWhatsappAfter62,
	getWhatsappAfter62TypingError,
	validateWhatsappNumber,
} from "~/lib/whatsapp";

interface WhatsappInputFieldProps {
	id: string;
	label: string;
	value: string;
	required?: boolean;
	error?: string | null;
	labelExtra?: ReactNode;
	onChange: (nextSuffix: string, typingError: string | null) => void;
	onBlurError?: (error: string | null) => void;
}

/**
 * Indonesian WhatsApp number field with a fixed `+62` prefix, auto-grouping,
 * immediate prefix validation, and blur validation.
 */
export function WhatsappInputField({
	id,
	label,
	value,
	required = false,
	error,
	labelExtra,
	onChange,
	onBlurError,
}: WhatsappInputFieldProps) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id}>
					{label}
					{required ? (
						<span className="text-red-text"> *</span>
					) : (
						<span className="text-xs font-normal text-muted-foreground">
							{" "}
							(opsional)
						</span>
					)}
				</Label>
				{labelExtra}
			</div>

			<div
				className={cn(
					"flex min-h-[44px] w-full items-center overflow-hidden rounded-[8px] border bg-card transition-colors focus-within:ring-2 focus-within:ring-ring/40",
					error ? "border-secondary-red" : "border-input",
				)}
			>
				<span className="inline-flex min-h-[44px] shrink-0 select-none items-center border-r border-border bg-muted/60 px-3 text-sm font-semibold text-foreground tabular-nums">
					+62
				</span>
				<input
					id={id}
					type="tel"
					inputMode="tel"
					autoComplete="tel-national"
					maxLength={15}
					required={required}
					value={value}
					aria-invalid={Boolean(error)}
					onChange={(e) => {
						const formatted = formatWhatsappAfter62(e.target.value);
						onChange(formatted, getWhatsappAfter62TypingError(formatted));
					}}
					onBlur={() => {
						if (!onBlurError) return;
						if (!value.trim()) {
							onBlurError(null);
							return;
						}
						const check = validateWhatsappNumber(`+62 ${value}`);
						onBlurError(check.valid ? null : (check.error ?? null));
					}}
					placeholder="812-3456-7890"
					className="min-h-[44px] w-full bg-transparent px-3.5 py-2 text-sm text-foreground placeholder:text-text-muted focus:outline-none tabular-nums"
				/>
			</div>

			{error ? (
				<p role="alert" className="text-xs font-medium text-red-text">
					{error}
				</p>
			) : (
				<p className="text-xs text-muted-foreground">
					Format Indonesia: 9–13 digit setelah +62, diawali angka 8.
				</p>
			)}
		</div>
	);
}
