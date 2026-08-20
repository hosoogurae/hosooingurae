import { Camera } from "lucide-react";

export default function ListingMediaPlaceholder({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 to-navy-950 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(224,193,122,0.7)_1px,transparent_1px)] [background-size:18px_18px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,162,75,0.25),transparent_65%)]"
      />

      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/40 bg-white/5 text-gold-400 backdrop-blur">
          <Camera className="h-5 w-5" strokeWidth={1.75} />
        </span>
        {!compact && (
          <>
            <p className="text-sm font-semibold text-white">
              매물 사진 준비 중
            </p>
            <p className="text-xs text-white/50">
              실사진 등록 시 자동으로 표시됩니다
            </p>
          </>
        )}
      </div>
    </div>
  );
}
