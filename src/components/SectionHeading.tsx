/** Section title without the decorative bar (PS-2): title, highlighted word in the ink tone, short subtitle */
export function SectionHeading({ title, highlight, subtitle, id }: { title: string; highlight?: string; subtitle?: string; id?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <h2 id={id} className="text-3xl font-bold md:text-4xl">
        {title}
        {highlight && (
          <>
            {" "}
            <span className="text-primary-ink">{highlight}</span>
          </>
        )}
      </h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
