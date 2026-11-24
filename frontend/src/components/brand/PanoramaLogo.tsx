import { useId } from "react";

interface PanoramaIconProps {
  size?: number;
  className?: string;
}

/** Icono de Panorama: horizonte con montañas y sol sobre fondo degradado. */
export function PanoramaIcon({ size = 32, className }: PanoramaIconProps) {
  const gradientId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradientId})`} />
      <circle cx="44" cy="21" r="6" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M8 46 L22 27 L31 38 L39 29 L56 46 Z" fill="#FFFFFF" />
      <rect x="8" y="50" width="48" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.6" />
    </svg>
  );
}

interface PanoramaLogoProps {
  size?: number;
  subtitle?: string;
  className?: string;
}

/** Logo completo: icono + nombre de la aplicación (y subtítulo opcional). */
export function PanoramaLogo({ size = 36, subtitle, className }: PanoramaLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <PanoramaIcon size={size} className="shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-semibold tracking-tight text-foreground">Panorama</span>
        {subtitle ? <span className="text-xs text-muted">{subtitle}</span> : null}
      </div>
    </div>
  );
}
