import type { Metadata } from "next";
import {
  CEO_NAME,
  COMPANY_NAME,
  PHONE_NUMBER,
  PRIVACY_OFFICER_EMAIL,
} from "../data/contact";

export const metadata: Metadata = {
  title: `개인정보처리방침 | ${COMPANY_NAME}`,
  robots: { index: false, follow: false },
  alternates: { canonical: "/privacy" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-navy-950">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-navy-800/80">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold tracking-wide text-gold-600">
        {COMPANY_NAME}
      </p>
      <h1 className="mt-2 text-2xl font-black text-navy-950 sm:text-3xl">
        개인정보처리방침
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-navy-800/60">
        {COMPANY_NAME}(이하 「회사」)는 손님의 개인정보를 소중히 다루며,
        아래와 같이 개인정보를 처리하고 있습니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
        <p>회사는 아래 두 가지 경로로 개인정보를 수집합니다.</p>

        <p className="mt-3 font-semibold text-navy-900">
          ① 매물 상세페이지의 「연락받기」
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>필수: 이름, 연락처(휴대전화번호)</li>
          <li>선택: 희망 상담시간대</li>
        </ul>

        <p className="mt-3 font-semibold text-navy-900">
          ② 「매물 내놓기」(집을 내놓으실 때 남겨주시는 정보)
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>필수: 이름, 연락처(휴대전화번호)</li>
          <li>
            함께 받는 매물 정보: 단지명, 동, 층, 거래유형, 희망가, 거주
            여부, 인테리어 상태, 이사 가능 시기, 집 보기 가능 시간, 메모
          </li>
          <li>사진을 올려주신 경우: 그 사진</li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>매물 상담 및 안내</li>
          <li>접수하신 내용 확인 및 회신</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <ul className="list-disc space-y-1 pl-5">
          <li>문의·접수로 남겨주신 개인정보는 1년간 보관한 뒤 파기합니다.</li>
          <li>그 전에 삭제를 요청하시면 지체 없이 파기합니다.</li>
          <li>
            다만 계약이 체결된 건은 공인중개사법에 따라 거래계약서를 5년,
            중개대상물 확인·설명서를 3년 보존합니다.
          </li>
        </ul>
      </Section>

      <Section title="4. 개인정보의 제3자 제공 및 처리위탁">
        <p>
          회사는 아래와 같이 개인정보 처리업무를 위탁하거나, 서비스를
          제공하는 과정에서 아래 외부 서비스를 이용합니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Vercel Inc. — 웹사이트 호스팅</li>
          <li>Supabase, Inc. — 데이터베이스 및 첨부 사진 파일 저장</li>
          <li>
            OpenAI — 사무소 대면 상담 시 사무소 직원의 청각 보조를 위한
            실시간 자막 처리 목적으로만 이용합니다. 상담 음성은 자막으로
            바뀌는 즉시 사라지며 따로 저장되지 않습니다. 브라우저 자체
            음성인식 기능을 쓰는 경우에는 그 브라우저를 만든 회사의
            음성인식 서비스가 대신 이용됩니다.
          </li>
          <li>
            새 문의가 접수되면 사무소 담당자의 휴대전화로 알림을
            보내드리는데, 이 알림에는 문의자 성함이 포함되며 브라우저를
            만든 회사가 제공하는 알림 전송 서비스를 거쳐 전달됩니다. 알림
            내용은 암호화되어 전송됩니다.
          </li>
        </ul>
      </Section>

      <Section title="5. 정보주체의 권리·의무 및 행사 방법">
        <p>
          손님은 언제든지 등록되어 있는 자신의 개인정보를 조회·수정하거나
          삭제를 요청할 수 있으며, 수집·이용 동의를 철회할 수 있습니다.
          아래 개인정보 보호책임자에게 서면, 전화, 이메일 등으로 연락하시면
          지체 없이 조치하겠습니다.
        </p>
      </Section>

      <Section title="6. 개인정보 보호책임자">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            성명: {CEO_NAME} ({COMPANY_NAME} 대표)
          </li>
          <li>연락처: {PHONE_NUMBER}</li>
          <li>이메일: {PRIVACY_OFFICER_EMAIL}</li>
        </ul>
      </Section>

      <Section title="7. 시행일">
        <p>
          이 개인정보처리방침은 2026년 9월 13일부터 시행되며, 이전
          개인정보처리방침을 대체합니다.
        </p>
      </Section>
    </section>
  );
}
