import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandIconProps {
  variant: "casinobit" | "qtech";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
}

const sizeClasses = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

const iconPaths = {
  casinobit: "/images/CasinoBitIcon.png",
  qtech: "/images/QTIcon.png",
};

const defaultAlts = {
  casinobit: "CasinoBit",
  qtech: "QTech",
};

export function BrandIcon({
  variant,
  size = "md",
  className,
  alt,
}: BrandIconProps) {
  return (
    <Image
      src={iconPaths[variant]}
      alt={alt || defaultAlts[variant]}
      width={32}
      height={32}
      className={cn(
        sizeClasses[size],
        "object-contain flex-shrink-0",
        className
      )}
      priority={false}
    />
  );
}

// Convenience components for specific brands
export function CasinoBitIcon({
  size = "md",
  className,
  alt,
}: Omit<BrandIconProps, "variant">) {
  return (
    <BrandIcon
      variant="casinobit"
      size={size}
      className={className}
      alt={alt}
    />
  );
}

export function QTechIcon({
  size = "md",
  className,
  alt,
}: Omit<BrandIconProps, "variant">) {
  return (
    <BrandIcon variant="qtech" size={size} className={className} alt={alt} />
  );
}

export function TigerLogo() {
  return (
    <Image
      src="/images/LogoTiger.png"
      alt="Tiger Logo"
      width={32}
      height={32}
      // Maintain aspect ratio guidance if CSS overrides one dimension
      style={{ height: "auto" }}
      priority
    />
  );
}
