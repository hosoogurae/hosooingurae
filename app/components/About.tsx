import Image from "next/image";
import { CEO_PHOTO, OFFICE_INTERIOR_PHOTO, OFFICE_PHOTO } from "../data/media";

const VALUES = [
  {
    title: "지역 밀착 전문성",
    description:
      "구래동 일대 시세와 입지를 가장 잘 아는 공인중개사가 직접 상담합니다.",
  },
  {
    title: "정확한 매물 정보",
    description:
      "현장 확인을 거친 매물만 소개하여 믿을 수 있는 거래를 돕습니다.",
  },
  {
    title: "신속한 거래 진행",
    description:
      "계약부터 잔금까지 절차를 꼼꼼히 챙겨 빠르고 안전하게 진행합니다.",
  },
];

/**
 * 사무실 외관 사진(크게, 원본 비율 그대로) + 내부·대표 사진(있으면 그
 * 아래 작게). 사진이 없으면 해당 부분을 통째로 숨깁니다 — 빈 회색 박스는
 * 미완성처럼 보이므로 자리만 차지하게 두지 않습니다. public/에 파일을
 * 넣고 app/data/media.ts의 경로만 채우면 자동으로 나타납니다.
 *
 * office.jpg의 실제 픽셀 크기(1383×1137)를 그대로 넘겨 next/image가
 * 원본 가로 비율을 유지한 채(자르지 않고) w-full h-auto로 반응형
 * 표시하게 합니다 — fill+object-cover를 쓰면 가로 사진의 좌우가 잘려
 * 나가므로 여기서는 의도적으로 쓰지 않습니다.
 */
function AboutPhoto() {
  const hasSecondaryPhotos = Boolean(OFFICE_INTERIOR_PHOTO || CEO_PHOTO);
  if (!OFFICE_PHOTO && !hasSecondaryPhotos) return null;

  return (
    <div>
      {OFFICE_PHOTO && (
        <div className="overflow-hidden rounded-xl ring-1 ring-navy-900/10">
          <Image
            src={OFFICE_PHOTO}
            alt="호수공인중개사사무소 외관"
            width={1383}
            height={1137}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-auto w-full"
          />
        </div>
      )}
      {hasSecondaryPhotos && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {OFFICE_INTERIOR_PHOTO && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-1 ring-navy-900/10">
              <Image
                src={OFFICE_INTERIOR_PHOTO}
                alt="호수공인중개사사무소 사무실 내부"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
          {CEO_PHOTO && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg ring-1 ring-navy-900/10">
              <Image
                src={CEO_PHOTO}
                alt="호수공인중개사사무소 대표 김병수"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="bg-navy-900/[0.03] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div
          className={`grid gap-10 lg:items-start ${OFFICE_PHOTO ? "lg:grid-cols-2 lg:gap-16" : ""}`}
        >
          <AboutPhoto />

          <div className={OFFICE_PHOTO ? "" : "mx-auto max-w-2xl text-center"}>
            <p className="mb-3 text-sm font-semibold tracking-wide text-gold-600">
              ABOUT US
            </p>
            <h2 className="break-keep text-2xl font-black text-navy-950 sm:text-3xl">
              호수공인중개사사무소를 소개합니다
            </h2>
            <p className="mt-5 max-w-lg break-keep text-sm leading-relaxed text-navy-800/70">
              호수공인중개사사무소는 김포 한강신도시 구래동을 중심으로 아파트,
              오피스텔, 상가 매물을 전문적으로 중개합니다. 오랜 지역 경험을
              바탕으로 고객 한 분 한 분께 맞는 최적의 매물을 제안합니다.
            </p>
            <p className="mt-4 max-w-lg break-keep border-l-2 border-gold-500/40 py-0.5 pl-4 text-xs italic leading-relaxed text-navy-800/60">
              저희 가족도 구래동에 10년째 살고 있습니다. 이편한세상 상가에서
              매일 이웃을 만나는 동네 부동산으로, 살아본 사람만 아는 동네
              정보까지 정직하게 말씀드립니다.
            </p>
          </div>
        </div>

        <dl className="mt-16 grid gap-6 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div
              key={value.title}
              className="rounded-lg border border-navy-900/10 bg-white p-6"
            >
              <dt className="mb-2 text-base font-bold text-navy-950">
                {value.title}
              </dt>
              <dd className="text-sm leading-relaxed text-navy-800/70">
                {value.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
