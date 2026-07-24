import { ChevronDownIcon } from "./icons";
import RecommendSearchBox from "./RecommendSearchBox";
import TrustStats from "./TrustStats";

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

      <div className="relative mx-auto flex max-w-2xl flex-col items-center">
        <span
          className="animate-fade-in-up mb-6 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1 text-xs font-bold tracking-wide text-gold-400"
          style={{ animationDelay: "100ms" }}
        >
          호수공인중개사 AI 매물찾기
        </span>

        <h1
          className="animate-fade-in-up text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl"
          style={{ animationDelay: "0ms" }}
        >
          김포 구래동 부동산의 기준
        </h1>

        <div
          className="animate-fade-in-up mt-7 flex flex-col items-center"
          style={{ animationDelay: "100ms" }}
        >
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            호수공인중개사가 보유한 실제 매물에서
            <br />
            AI가 원하는 조건에 가까운 집을 찾아드립니다.
          </p>
        </div>

        <div
          className="animate-fade-in-up mt-8 w-full"
          style={{ animationDelay: "200ms" }}
        >
          <RecommendSearchBox
            size="medium"
            variant="dark"
            submitLabel="AI로 찾아보기"
            placeholder="예: 구래역 가까운 4억대 아파트"
            exampleQueries={["구래역 가까운 집", "4억 이하 아파트", "바로 입주"]}
          />
        </div>

        <div
          className="animate-fade-in-up mt-10 w-full"
          style={{ animationDelay: "300ms" }}
        >
          <TrustStats />
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
