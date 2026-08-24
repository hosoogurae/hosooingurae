import type { Metadata } from "next";
import { COMPANY_NAME } from "../data/contact";

export const metadata: Metadata = {
  title: `개인정보처리방침 | ${COMPANY_NAME}`,
  robots: { index: false, follow: false },
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
        <p>
          회사는 매물 문의·연락받기 신청 시 아래 항목을 수집합니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>필수: 이름, 연락처(휴대전화번호)</li>
          <li>선택: 희망 상담시간대</li>
        </ul>
        <p className="mt-2">
          수집 방법: 매물 상세페이지의 「연락받기」 폼 제출
        </p>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>매물 상담 및 안내</li>
          <li>문의 사항에 대한 회신</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <p>
          [보유기간 — 예: 수집일로부터 O개월/O년]. 보유기간 경과, 처리
          목적 달성 등 개인정보가 불필요하게 되었을 때는 지체 없이
          파기합니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          회사는 원칙적으로 손님의 개인정보를 제1항의 목적 범위를 초과하여
          이용하거나 외부에 제공하지 않습니다. [제3자 제공이 있는 경우 그
          내용을 기재 — 없으면 「해당 없음」]
        </p>
      </Section>

      <Section title="5. 개인정보처리 위탁">
        <p>
          [처리위탁 여부 및 수탁자·위탁업무 내용 기재 — 없으면 「해당 없음」]
        </p>
      </Section>

      <Section title="6. 정보주체의 권리·의무 및 행사 방법">
        <p>
          손님은 언제든지 등록되어 있는 자신의 개인정보를 조회·수정하거나
          삭제를 요청할 수 있으며, 수집·이용 동의를 철회할 수 있습니다.
          아래 개인정보 보호책임자에게 서면, 전화, 이메일 등으로 연락하시면
          지체 없이 조치하겠습니다.
        </p>
      </Section>

      <Section title="7. 개인정보 보호책임자">
        <ul className="list-disc space-y-1 pl-5">
          <li>성명: [보호책임자 성명]</li>
          <li>연락처: [보호책임자 전화번호]</li>
          <li>이메일: [보호책임자 이메일]</li>
        </ul>
      </Section>

      <Section title="8. 개인정보처리방침의 변경">
        <p>
          이 개인정보처리방침은 [시행일자]부터 적용됩니다. 법령·정책 또는
          보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는
          변경사항의 시행 전에 공지하겠습니다.
        </p>
      </Section>
    </section>
  );
}
