import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarDays,
  Car,
  Compass,
  ExternalLink,
  Flame,
  GraduationCap,
  Home,
  Layers,
  MapPin,
  Ruler,
  TrainFront,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PHONE_HREF, PHONE_NUMBER } from "../../data/contact";
import { getListingById } from "../../lib/listings";
import { getTransactionsByComplexId } from "../../lib/transactions";
import ListingMediaPlaceholder from "../../components/ListingMediaPlaceholder";
import ListingGallery from "../../components/ListingGallery";
import TransactionPriceChart from "../../components/TransactionPriceChart";
import { PhoneIcon } from "../../components/icons";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

// 매물 데이터를 Supabase에서 매 요청마다 새로 읽어오므로 정적 캐싱을 끕니다.
// 관리자가 등록/수정/삭제한 매물이 재배포 없이 바로 반영됩니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    return { title: "매물을 찾을 수 없습니다 | 호수공인중개사사무소" };
  }

  return {
    title: `${listing.complex.name} ${listing.transactionType} ${listing.priceLabel} | 호수공인중개사사무소`,
    description: listing.shortDescription,
  };
}

function formatVerifiedDate(dateStr: string) {
  return dateStr.replaceAll("-", ".");
}

function InfoItem({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-600">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <div>
        <dt className="text-navy-800/50">{label}</dt>
        <dd className="mt-1 font-semibold text-navy-950">{value}</dd>
        {note && (
          <p className="mt-1 text-xs font-normal text-navy-800/50">{note}</p>
        )}
      </div>
    </div>
  );
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    notFound();
  }

  const { complex } = listing;
  const transportation = complex.transportation.subway
    ? `${complex.transportation.subway} ${complex.transportation.subwayDistance ?? ""}`.trim()
    : "-";
  const heroImage = listing.images?.[0] ?? listing.image;
  const transactions = getTransactionsByComplexId(complex.id);

  return (
    <>
      <section className="bg-navy-950 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/listings"
            className="text-sm font-medium text-white/60 transition-colors hover:text-gold-400"
          >
            ← 전체 매물로 돌아가기
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "0ms" }}
            >
              <p className="text-sm font-semibold tracking-wide text-gold-400">
                {complex.name}
              </p>
              <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                {listing.transactionType} {listing.priceLabel}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {listing.shortDescription}
              </p>

              {listing.verifiedDate && (
                <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold-400">
                  확인매물 {formatVerifiedDate(listing.verifiedDate)}
                </span>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/#contact"
                  className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-center text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition-transform hover:scale-[1.03]"
                >
                  문의하기
                </Link>
                <a
                  href={PHONE_HREF}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:border-gold-400 hover:text-gold-400"
                >
                  <PhoneIcon className="h-4 w-4" />
                  전화 상담 {PHONE_NUMBER}
                </a>
                {listing.naverUrl && (
                  <a
                    href={listing.naverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:border-gold-400 hover:text-gold-400"
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={2} />
                    네이버부동산에서 보기
                  </a>
                )}
              </div>
            </div>

            <div
              className="animate-fade-in-up"
              style={{ animationDelay: "120ms" }}
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={`${complex.name} 대표 이미지`}
                  className="aspect-[4/3] w-full rounded-2xl object-cover"
                />
              ) : (
                <ListingMediaPlaceholder className="aspect-[4/3] w-full rounded-2xl" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        >
          <h2 className="text-lg font-bold text-navy-950">사진</h2>
          <div className="mt-6">
            <ListingGallery images={listing.images} />
          </div>
        </div>

        <div
          className="animate-fade-in-up mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8"
          style={{ animationDelay: "80ms" }}
        >
          <h2 className="text-lg font-bold text-navy-950">매물 핵심정보</h2>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 text-sm sm:grid-cols-4">
            <InfoItem
              icon={Ruler}
              label="공급면적"
              value={`${listing.supplyArea}㎡`}
            />
            <InfoItem
              icon={Home}
              label="전용면적"
              value={`${listing.exclusiveArea}㎡`}
            />
            <InfoItem
              icon={Layers}
              label="층수"
              value={`${listing.floor}층 / ${listing.totalFloors}층`}
            />
            <InfoItem
              icon={Compass}
              label="방향"
              value={listing.direction}
            />
            <InfoItem
              icon={BedDouble}
              label="방"
              value={`${listing.roomCount}개`}
            />
            <InfoItem
              icon={Bath}
              label="욕실"
              value={`${listing.bathroomCount}개`}
            />
            <InfoItem
              icon={CalendarCheck}
              label="입주 가능일"
              value={listing.moveInDate}
            />
            {listing.maintenanceFee && (
              <InfoItem
                icon={Wallet}
                label="관리비"
                value={listing.maintenanceFee}
                note="실제 관리비는 세대별 사용량과 계절에 따라 달라질 수 있습니다."
              />
            )}
          </dl>
        </div>

        <div
          className="animate-fade-in-up mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8"
          style={{ animationDelay: "160ms" }}
        >
          <h2 className="text-lg font-bold text-navy-950">매물 특징</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {listing.features.map((feature) => (
              <li
                key={feature}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gradient-to-r from-gold-500/10 to-gold-400/5 px-3.5 py-2 text-sm font-medium text-gold-600 shadow-sm"
              >
                <BadgeCheck className="h-4 w-4" strokeWidth={2} />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="animate-fade-in-up mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8"
          style={{ animationDelay: "200ms" }}
        >
          <h2 className="text-lg font-bold text-navy-950">최근 실거래가</h2>
          <p className="mt-1 text-sm text-navy-800/60">
            동일 전용면적의 신고된 매매 거래를 기준으로 제공합니다.
          </p>

          <div className="mt-6">
            <TransactionPriceChart
              transactions={transactions}
              complexId={complex.id}
              exclusiveArea={listing.exclusiveArea}
            />
          </div>

          <ul className="mt-6 list-disc space-y-1 pl-4 text-xs leading-relaxed text-navy-800/50">
            <li>실거래가는 신고 및 정정 여부에 따라 변경될 수 있습니다.</li>
            <li>층, 향, 내부 상태 등에 따라 실제 매물 가격과 차이가 날 수 있습니다.</li>
            <li>
              정확한 거래 정보는 국토교통부 실거래가 공개시스템에서 확인해
              주세요.
            </li>
          </ul>
        </div>

        <div
          className="animate-fade-in-up mt-8 rounded-xl border border-navy-900/10 p-6 sm:p-8"
          style={{ animationDelay: "320ms" }}
        >
          <h2 className="text-lg font-bold text-navy-950">단지정보</h2>
          <dl className="mt-6 grid gap-x-6 gap-y-6 text-sm sm:grid-cols-2">
            {complex.address && (
              <InfoItem icon={MapPin} label="주소" value={complex.address} />
            )}
            <InfoItem icon={TrainFront} label="교통" value={transportation} />
            {complex.nearbySchools.length > 0 && (
              <InfoItem
                icon={GraduationCap}
                label="학교"
                value={complex.nearbySchools.join(", ")}
              />
            )}
            {complex.parkingCount !== undefined && (
              <InfoItem
                icon={Car}
                label="주차"
                value={
                  complex.parkingPerHousehold !== undefined
                    ? `${complex.parkingCount.toLocaleString()}대 (세대당 ${complex.parkingPerHousehold}대)`
                    : `${complex.parkingCount.toLocaleString()}대`
                }
              />
            )}
            {complex.builder && (
              <InfoItem icon={Building2} label="건설사" value={complex.builder} />
            )}
            {complex.heating && (
              <InfoItem icon={Flame} label="난방" value={complex.heating} />
            )}
            {complex.approvalDate && (
              <InfoItem
                icon={CalendarDays}
                label="사용승인일"
                value={complex.approvalDate}
              />
            )}
            {complex.totalHouseholds !== undefined && (
              <InfoItem
                icon={Users}
                label="세대수"
                value={
                  complex.buildings !== undefined
                    ? `${complex.totalHouseholds.toLocaleString()}세대 / ${complex.buildings}개동`
                    : `${complex.totalHouseholds.toLocaleString()}세대`
                }
              />
            )}
          </dl>

          {complex.features.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-navy-800/50">
                단지 특징
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {complex.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-md bg-navy-900/5 px-3 py-1.5 text-sm text-navy-800"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-navy-900/[0.03] p-6 text-xs leading-relaxed text-navy-800/60 sm:p-8">
          <ul className="list-disc space-y-1 pl-4">
            <li>매물 정보는 현장 상황과 거래 시점에 따라 달라질 수 있습니다.</li>
            <li>관리비는 세대별 사용량과 계절에 따라 달라질 수 있습니다.</li>
            <li>정확한 내용은 호수공인중개사에 문의해 주세요.</li>
          </ul>
        </div>

        {listing.naverUrl && (
          <div className="mt-8 flex flex-col items-start gap-2">
            <a
              href={listing.naverUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-navy-900/15 px-6 py-3 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:text-gold-600"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
              네이버부동산에서 보기
            </a>
            <p className="text-xs text-navy-800/50">
              사진과 상세 설명은 네이버부동산 원문에서 확인해 주세요.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
