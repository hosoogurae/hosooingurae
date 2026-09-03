export default function Loading() {
  return (
    <>
      <section className="bg-navy-950 px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-wide text-gold-400">SISE</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">구래동 아파트 시세</h1>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-xl border border-navy-900/10 bg-navy-900/[0.03]"
            />
          ))}
        </div>
      </section>
    </>
  );
}
