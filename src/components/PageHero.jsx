import "./PageHero.css";

export default function PageHero({ eyebrow, title, lede }) {
  return (
    <section className="page-hero">
      <div className="wrap">

        {eyebrow && (
          <p className="page-hero__eyebrow">
            {eyebrow}
          </p>
        )}

        <h1 className="page-hero__title">
          {title}
        </h1>

        {lede && (
          <p className="page-hero__lede">
            {lede}
          </p>
        )}

      </div>

      <div className="page-hero__horizon" />
    </section>
  );
}