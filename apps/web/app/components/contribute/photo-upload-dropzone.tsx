import type { LucideIcon } from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";
import { cn } from "~/lib/utils";

interface PhotoUploadDropzoneProps {
	id: string;
	icon: LucideIcon;
	title: string;
	subtitle: string;
	multiple?: boolean;
	required?: boolean;
	hasError?: boolean;
	className?: string;
	titleClassName?: string;
	onFilesSelected: (files: FileList | File[] | null) => void | Promise<void>;
}

export function PhotoUploadDropzone({
	id,
	icon: Icon,
	title,
	subtitle,
	multiple = false,
	required = false,
	hasError = false,
	className,
	titleClassName,
	onFilesSelected,
}: PhotoUploadDropzoneProps) {
	const [isDragActive, setIsDragActive] = useState(false);

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		void onFilesSelected(e.target.files);
		e.target.value = "";
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragActive(false);
		void onFilesSelected(e.dataTransfer.files);
	};

	return (
		<>
			<label
				htmlFor={id}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragActive(true);
				}}
				onDragLeave={() => setIsDragActive(false)}
				onDrop={handleDrop}
				className={cn(
					"flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed px-4 py-4 text-center text-sm transition-colors",
					isDragActive
						? "border-primary bg-primary-soft/60 text-foreground"
						: hasError
							? "border-secondary-red bg-red-soft/30 text-foreground"
							: "border-border bg-background/60 text-muted-foreground hover:border-primary hover:text-foreground",
					className,
				)}
			>
				<Icon className="size-5 text-primary" aria-hidden="true" />
				<span className={cn("font-medium text-foreground", titleClassName)}>
					{title}
				</span>
				<span className="text-xs text-muted-foreground">{subtitle}</span>
			</label>
			<input
				id={id}
				type="file"
				accept="image/*"
				multiple={multiple}
				required={required}
				onChange={handleFileChange}
				className="sr-only"
			/>
		</>
	);
}
