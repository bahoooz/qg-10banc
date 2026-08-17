import { Check } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type AppCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type">;

const sizeClasses = {
  sm: "size-5 rounded-md border-2",
  md: "size-8 rounded-full border-[3px]",
} as const;

const iconSizes = {
  sm: "size-3",
  md: "size-4",
} as const;

export default function AppCheckbox({
  checked,
  onChange,
  disabled = false,
  size = "sm",
  className = "",
  onClick,
  ...rest
}: AppCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onChange(!checked);
        onClick?.(event);
      }}
      className={`inline-flex shrink-0 items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${sizeClasses[size]} ${
        checked
          ? "border-main-color bg-main-color shadow-[0_0_12px_rgba(205,183,255,0.35)]"
          : "border-secondary-color bg-background hover:border-main-color/40"
      } ${className}`}
      {...rest}
    >
      {checked ? (
        <Check
          className={`${iconSizes[size]} text-background stroke-[3]`}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
