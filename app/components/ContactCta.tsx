import { NAVER_MAP_URL, PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { LocationIcon } from "./icons";

export default function ContactCta() {
  return (
    <section id="contact" className="bg-navy-950 px-6 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-black text-white sm:text-3xl">
          매물 상담이 필요하신가요?
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
          아파트, 오피스텔, 상가 매물 문의부터 매도·매수 상담까지 언제든지
          편하게 연락 주세요.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={PHONE_HREF}
            className="w-full rounded-md bg-gold-500 px-8 py-3 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 sm:w-auto"
          >
            전화 상담 {PHONE_NUMBER}
          </a>
          <a
            href={NAVER_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/30 px-8 py-3 text-sm font-bold text-white transition-colors hover:border-gold-400 hover:text-gold-400 sm:w-auto"
          >
            <LocationIcon className="h-4 w-4" />
            오시는 길
          </a>
        </div>
      </div>
    </section>
  );
}
