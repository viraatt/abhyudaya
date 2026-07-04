import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { events } from "../data/club.js";
import PageHero from "../components/PageHero.jsx";
import { CardContainer, CardBody, CardItem } from "../components/ui/3d-card";
import "./Gallery.css";

const PLACEHOLDER = (seed) =>
  `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&sig=${seed}`;

const imageModules = import.meta.glob(
  "../assets/**/*.{jpg,jpeg,png,gif,webp}",
  { eager: true },
);

function getImagePath(imagePath) {
  if (!imagePath) return PLACEHOLDER(0);
  const modulePath = `../${imagePath}`;
  return imageModules[modulePath]?.default || imagePath;
}

/* ─── Expanded Overlay ───────────────────────────────────── */
function ExpandedOverlay({ selected, onClose }) {
  const [index, setIndex] = useState(0);

  useEffect(() => { setIndex(0); }, [selected]);

  const photos = selected?.photos || [selected?.src];

  const next = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % photos.length);
  };

  const prev = (e) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <AnimatePresence>
      {selected && (
        <>
          <motion.div
            className="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="overlay-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <img
              className="overlay-image"
              src={photos[index]}
              alt={selected.title}
            />

            {photos.length > 1 && (
              <>
                <button className="overlay-nav-btn overlay-nav-btn--prev" onClick={prev}>←</button>
                <button className="overlay-nav-btn overlay-nav-btn--next" onClick={next}>→</button>
                <div className="overlay-counter">
                  {index + 1} / {photos.length}
                </div>
              </>
            )}

            <div className="overlay-gradient" />

            <div className="overlay-caption">
              <p className="overlay-caption__title">{selected.title}</p>
              <span className="overlay-caption__kind">{selected.kind}</span>
            </div>

            <button className="overlay-close" onClick={onClose}>✕</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main Gallery ───────────────────────────────────────── */
export default function Gallery() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const cards = events.map((ev, i) => {
    let coverSrc;
    if (ev.photo && ev.photo.trim()) {
      coverSrc = getImagePath(ev.photo);
    } else if (ev.photos && ev.photos.length > 0) {
      coverSrc = getImagePath(ev.photos[0]);
    } else {
      coverSrc = PLACEHOLDER(i);
    }

    const photoList =
      ev.photos && ev.photos.length > 0
        ? ev.photos.map(getImagePath)
        : [coverSrc];

    return {
      title: ev.name,
      kind: ev.kind,
      src: coverSrc,
      photos: photoList,
    };
  });

  return (
    <div className="bg-black min-h-screen">
      <PageHero
        eyebrow="Moments"
        title="A look inside the club."
        lede="Interactive 3D memories. Click any photo to expand."
      />

      <section className="gallery-section">
        <div className="gallery-wrap">
          <div className="gallery-cards-grid">
            {cards.map((card, index) => (
              <div
                key={index}
                className={`gallery-card-wrapper${
                  hovered !== null && hovered !== index
                    ? " gallery-card-wrapper--blurred"
                    : ""
                }`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <CardContainer className="inter-var w-full">
                  <CardBody className="bg-zinc-900/50 relative group/card border-white/[0.08] w-full h-auto rounded-[2.5rem] p-8 border flex flex-col items-start justify-between">
                    <CardItem
                      translateZ="100"
                      className="text-2xl font-bold text-white mb-6"
                    >
                      {card.title}
                    </CardItem>

                    <CardItem translateZ="50" className="w-full mb-8">
                      <div className="relative">
                        <img
                          src={card.src}
                          className="h-64 w-full object-cover rounded-2xl group-hover/card:shadow-emerald-500/20 shadow-xl cursor-pointer"
                          alt={card.title}
                          onClick={() => setSelected(card)}
                        />
                        {card.photos.length > 1 && (
                          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold">
                            {card.photos.length} PHOTOS
                          </div>
                        )}
                      </div>
                    </CardItem>

                    <CardItem
                      translateZ="100"
                      className="text-emerald-500 text-sm font-black uppercase tracking-[0.25em]"
                    >
                      {card.kind}
                    </CardItem>
                  </CardBody>
                </CardContainer>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExpandedOverlay selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}