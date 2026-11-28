import type { ReactNode } from "react";
import {
	formatPriceRangeInput,
	handleOpeningHoursInput,
	parseOpeningHoursValue,
	parsePriceRangeValue,
} from "~/components/contribute/add-place-validation";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const HOURS_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "06.00 - 15.00 WIB", value: "06.00 - 15.00" },
	{ label: "08.00 - 20.00 WIB", value: "08.00 - 20.00" },
	{ label: "16.00 - 23.00 WIB", value: "16.00 - 23.00" },
	{ label: "Buka 24 Jam", value: "Buka 24 Jam" },
];

const PRICE_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "Rp 8.000 - Rp 18.000", value: "8.000 - 18.000" },
	{ label: "Rp 15.000 - Rp 30.000", value: "15.000 - 30.000" },
	{ label: "Rp 25.000 - Rp 55.000", value: "25.000 - 55.000" },
];

interface OpeningHoursFieldProps {
	id: string;
	label?: string;
	required?: boolean;
	value: string;
	error?: string | null;
	showPresets?: boolean;
	labelExtra?: ReactNode;
	onChange: (nextValue: string, nextError?: string | null) => void;
	onBlurError?: (error: string | null) => void;
}

export function OpeningHoursField({
	id,
	label = "Jam buka",
	required = false,
	value,
	error,
	showPresets = false,
	labelExtra,
	onChange,
	onBlurError,
}: OpeningHoursFieldProps) {
	const is24Hours = value === "Buka 24 Jam";

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id}>
					{label}
					{required ? <span className="text-red-text"> *</span> : null}
				</Label>
				{labelExtra}
			</div>

			<div className="relative">
				<Input
					id={id}
					type="text"
					inputMode="numeric"
					required={required}
					maxLength={13}
					value={value}
					onChange={(e) => {
						const result = handleOpeningHoursInput(e.target.value, value);
						onChange(result.value, result.error ?? null);
					}}
					onBlur={() => {
						if (!onBlurError) return;
						if (!value.trim()) {
							onBlurError(null);
							return;
						}
						const check = parseOpeningHoursValue(value);
						onBlurError(check.error ?? null);
					}}
					aria-invalid={Boolean(error)}
					placeholder="08.00 - 20.00"
					className={cn("tabular-nums", !is24Hours && "pr-12")}
				/>
				{!is24Hours ? (
					<span
						aria-hidden="true"
						className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
					>
						WIB
					</span>
				) : null}
			</div>

			{error ? (
				<p role="alert" className="text-xs font-medium text-red-text">
					{error}
				</p>
			) : null}

			{showPresets ? (
				<div className="flex flex-wrap gap-1.5">
					{HOURS_PRESETS.map((preset) => {
						const active = value === preset.value;
						return (
							<button
								key={preset.label}
								type="button"
								onClick={() => {
									const next =
										preset.value === "Buka 24 Jam" && value === "Buka 24 Jam"
											? ""
											: preset.value;
									onChange(next, null);
								}}
								className={cn(
									"min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
									active
										? "border-primary bg-primary-soft text-primary-hover font-semibold"
										: "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
								)}
							>
								{preset.label}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

interface PriceRangeFieldProps {
	id: string;
	label?: string;
	required?: boolean;
	value: string;
	error?: string | null;
	showPresets?: boolean;
	labelExtra?: ReactNode;
	onChange: (nextValue: string) => void;
	onBlurError?: (error: string | null) => void;
}

export function PriceRangeField({
	id,
	label = "Kisaran harga",
	required = false,
	value,
	error,
	showPresets = false,
	labelExtra,
	onChange,
	onBlurError,
}: PriceRangeFieldProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id}>
					{label}
					{required ? <span className="text-red-text"> *</span> : null}
				</Label>
				{labelExtra}
			</div>

			<div className="relative">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
				>
					Rp
				</span>
				<Input
					id={id}
					type="text"
					required={required}
					maxLength={25}
					value={value}
					onChange={(e) =>
						onChange(formatPriceRangeInput(e.target.value, value))
					}
					onBlur={() => {
						if (!onBlurError) return;
						if (!value.trim()) {
							onBlurError(null);
							return;
						}
						const check = parsePriceRangeValue(value);
						onBlurError(check.error ?? null);
					}}
					aria-invalid={Boolean(error)}
					placeholder="12.000 - 25.000"
					className="pl-9 tabular-nums"
				/>
			</div>

			{error ? (
				<p role="alert" className="text-xs font-medium text-red-text">
					{error}
				</p>
			) : null}

			{showPresets ? (
				<div className="flex flex-wrap gap-1.5">
					{PRICE_PRESETS.map((preset) => {
						const active = value === preset.value;
						return (
							<button
								key={preset.label}
								type="button"
								onClick={() => onChange(preset.value)}
								className={cn(
									"min-h-[44px] rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
									active
										? "border-primary bg-primary-soft text-primary-hover font-semibold"
										: "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground",
								)}
							>
								{preset.label}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
