import type { Property } from "../data/properties";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="flex aspect-[4/3] items-center justify-center bg-navy-900/5 text-sm font-medium text-navy-900/40">
        이미지 준비중
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className="w-fit rounded-full bg-navy-900/5 px-3 py-1 text-xs font-semibold text-navy-800">
          {property.type}
        </span>

        <h3 className="text-lg font-bold leading-snug text-navy-950">
          {property.title}
        </h3>

        <p className="text-xl font-black text-gold-600">{property.price}</p>

        <dl className="grid grid-cols-2 gap-y-1 text-sm text-navy-800/80">
          <dt className="text-navy-800/50">위치</dt>
          <dd>{property.location}</dd>
          <dt className="text-navy-800/50">면적</dt>
          <dd>{property.area}</dd>
        </dl>

        <ul className="mt-auto flex flex-wrap gap-2 pt-2">
          {property.features.map((feature) => (
            <li
              key={feature}
              className="rounded-md border border-gold-500/30 px-2 py-1 text-xs font-medium text-gold-600"
            >
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
