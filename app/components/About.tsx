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

export default function About() {
  return (
    <section id="about" className="bg-navy-900/[0.03] px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-gold-600">
            ABOUT US
          </p>
          <h2 className="text-2xl font-black text-navy-950 sm:text-3xl">
            호수공인중개사사무소를 소개합니다
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-navy-800/70 sm:text-base">
            호수공인중개사사무소는 김포 한강신도시 구래동을 중심으로 아파트,
            오피스텔, 상가 매물을 전문적으로 중개합니다. 오랜 지역 경험을
            바탕으로 고객 한 분 한 분께 맞는 최적의 매물을 제안합니다.
          </p>
        </div>

        <dl className="grid gap-6 sm:grid-cols-1">
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
