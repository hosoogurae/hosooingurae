import { CameraIcon } from "./icons";

export default function ListingImagePlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-navy-900/5 text-navy-900/40 ${className}`}
    >
      <CameraIcon className="h-8 w-8" />
      <span className="text-sm font-medium">매물 사진 준비 중</span>
    </div>
  );
}
