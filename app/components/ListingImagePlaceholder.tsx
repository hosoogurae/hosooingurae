export default function ListingImagePlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900/[0.03] to-navy-900/[0.07] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(11,26,51,0.06)_1px,transparent_1px)] [background-size:14px_14px]"
      />

      <div className="relative flex flex-col items-center gap-1.5 px-4">
        <svg
          aria-hidden
          viewBox="0 0 48 32"
          className="h-7 w-auto text-navy-900/15"
          fill="currentColor"
        >
          <rect x="2" y="10" width="10" height="20" rx="0.5" />
          <rect x="14" y="2" width="12" height="28" rx="0.5" />
          <rect x="28" y="14" width="9" height="16" rx="0.5" />
          <rect x="39" y="7" width="8" height="23" rx="0.5" />
        </svg>
        <span className="text-xs font-medium text-navy-900/30">
          사진 준비 중
        </span>
      </div>
    </div>
  );
}
