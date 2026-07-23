import { NAVER_MAP_URL, PHONE_HREF } from "../data/contact";
import { ArrowIcon, ChevronDownIcon, LocationIcon } from "./icons";
import RecommendSearchBox from "./RecommendSearchBox";

const STATS = [
  { value: "15년+", label: "구래동 중개 경력" },
  { value: "1,200건+", label: "누적 거래 성사" },
  { value: "4.9 / 5", label: "고객 상담 만족도" },
];

function HeroBackground() {
  return (
    <>
      <svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <pattern
            id="hero-windows"
            width="34"
            height="42"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="6"
              y="8"
              width="22"
              height="26"
              rx="1"
              fill="rgba(255,255,255,0.05)"
            />
          </pattern>
          <linearGradient id="hero-tower-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16305c" />
            <stop offset="100%" stopColor="#0b1a33" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1440" height="900" fill="#060e1f" />

        <rect x="120" y="260" width="220" height="640" fill="url(#hero-tower-fade)" />
        <rect x="120" y="260" width="220" height="640" fill="url(#hero-windows)" />

        <rect x="420" y="140" width="260" height="760" fill="url(#hero-tower-fade)" />
        <rect x="420" y="140" width="260" height="760" fill="url(#hero-windows)" />

        <rect x="760" y="220" width="230" height="680" fill="url(#hero-tower-fade)" />
        <rect x="760" y="220" width="230" height="680" fill="url(#hero-windows)" />

        <rect x="1070" y="180" width="250" height="720" fill="url(#hero-tower-fade)" />
        <rect x="1070" y="180" width="250" height="720" fill="url(#hero-windows)" />

        <g fill="#e0c17a" opacity="0.55">
          <rect x="160" y="308" width="22" height="26" />
          <rect x="228" y="392" width="22" height="26" />
          <rect x="160" y="560" width="22" height="26" />
          <rect x="296" y="644" width="22" height="26" />

          <rect x="460" y="192" width="22" height="26" />
          <rect x="528" y="276" width="22" height="26" />
          <rect x="596" y="192" width="22" height="26" />
          <rect x="460" y="444" width="22" height="26" />
          <rect x="630" y="528" width="22" height="26" />

          <rect x="800" y="272" width="22" height="26" />
          <rect x="868" y="356" width="22" height="26" />
          <rect x="936" y="440" width="22" height="26" />
          <rect x="800" y="524" width="22" height="26" />

          <rect x="1110" y="232" width="22" height="26" />
          <rect x="1178" y="316" width="22" height="26" />
          <rect x="1246" y="400" width="22" height="26" />
          <rect x="1110" y="484" width="22" height="26" />
        </g>
      </svg>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(6,14,31,0.35),rgba(6,14,31,0.88)_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/20"
      />
    </>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-navy-950 px-6 pb-24 pt-28 text-center sm:pb-32 sm:pt-36"
    >
      <HeroBackground />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center">
        <span
          className="animate-fade-in-up mb-6 rounded-full border border-gold-500/40 px-4 py-1 text-xs font-medium tracking-wide text-gold-400"
          style={{ animationDelay: "0ms" }}
        >
          김포시 구래동 공인중개사사무소
        </span>

        <h1
          className="animate-fade-in-up text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl"
          style={{ animationDelay: "100ms" }}
        >
          김포 구래동 부동산의 기준
        </h1>

        <p
          className="animate-fade-in-up mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
          style={{ animationDelay: "200ms" }}
        >
          호수공인중개사사무소가 구래동 아파트, 오피스텔, 상가 매물을
          정확하고 신속하게 안내합니다.
        </p>

        <div
          className="animate-fade-in-up mt-10 w-full max-w-2xl"
          style={{ animationDelay: "300ms" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1 text-xs font-bold tracking-wide text-gold-400">
            ✦ 호수 AI 매물찾기
          </span>
          <p className="mt-3 text-xl font-black text-white sm:text-2xl">
            AI에게 원하는 집을 말해보세요.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
            호수공인중개사가 보유한 실제 매물 중 조건에 가장 가까운 집을
            찾아드립니다.
          </p>
          <div className="mt-5">
            <RecommendSearchBox
              size="large"
              variant="dark"
              submitLabel="AI로 찾아보기"
              placeholder="예: 구래역 가까운 4억대 아파트, 바로 입주 가능한 집"
              exampleQueries={["구래역 가까운 집", "4억 이하 아파트", "바로 입주"]}
            />
          </div>
        </div>

        <dl
          className="animate-fade-in-up mt-10 grid w-full max-w-2xl grid-cols-3 gap-4 border-y border-white/10 py-6"
          style={{ animationDelay: "400ms" }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-lg font-black text-gold-400 sm:text-xl">
                {stat.value}
              </dd>
              <p className="mt-1 text-center text-xs text-white/60 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </dl>

        <div
          className="animate-fade-in-up mt-10 flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row"
          style={{ animationDelay: "500ms" }}
        >
          <a
            href="#properties"
            className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-8 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition-all hover:scale-[1.04] hover:shadow-xl hover:shadow-gold-500/40"
          >
            추천매물 보기
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href={PHONE_HREF}
            className="flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-8 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:scale-[1.04] hover:border-gold-400 hover:bg-white/10 hover:text-gold-400"
          >
            문의하기
          </a>
          <a
            href={NAVER_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-8 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:scale-[1.04] hover:border-gold-400 hover:bg-white/10 hover:text-gold-400"
          >
            <LocationIcon className="h-4 w-4" />
            오시는 길
          </a>
        </div>
      </div>

      <a
        href="#properties"
        aria-label="다음 섹션으로 스크롤"
        className="animate-bounce absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/50 transition-colors hover:text-gold-400"
      >
        <span className="text-[10px] font-medium tracking-[0.2em]">SCROLL</span>
        <ChevronDownIcon className="h-5 w-5" />
      </a>
    </section>
  );
}
