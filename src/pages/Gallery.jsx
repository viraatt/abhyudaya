import { events } from '../data/club.js'
import PageHero from '../components/PageHero.jsx'
import './Gallery.css'

// Gradient placeholders stand in for event photography. Swap each
// .gallery-tile__img background for a real <img src="..."> when photos
// from TechBloom and other events are available.
const gradients = [
  'linear-gradient(135deg, #0d1224, #1c2549)',
  'linear-gradient(135deg, #7a2128, #eeb84a)',
  'linear-gradient(135deg, #1c2549, #eeb84a)',
  'linear-gradient(135deg, #eeb84a, #f7d189)',
  'linear-gradient(135deg, #161d3a, #7a2128)',
  'linear-gradient(135deg, #0d1224, #a5424a)',
]

export default function Gallery() {
  return (
    <>
      <PageHero
        eyebrow="Moments"
        title="A look inside the club."
        lede="Photos from TechBloom and other events go here — these tiles are placeholders, styled and ready for real event photography."
      />

      <section className="section">
        <div className="wrap">
          <div className="gallery-grid">
            {events.map((ev, i) => (
              <figure
                className="gallery-tile"
                key={ev.slug}
                style={{ background: gradients[i % gradients.length] }}
              >
                <figcaption>
                  <span className="eyebrow">{ev.kind}</span>
                  <span className="gallery-tile__name">{ev.name}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
