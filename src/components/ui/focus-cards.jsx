import { useState } from "react"

/* ─── Single Card ─────────────────────────────────────────── */

function Card({ card, index, hovered, setHovered, onClick }) {
  const isHovered = hovered === index
  const someOtherHovered = hovered !== null && !isHovered

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        height: '280px',
        cursor: 'pointer',
        transition: 'filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease',
        filter: someOtherHovered ? 'blur(3px)' : 'blur(0px)',
        opacity: someOtherHovered ? 0.45 : 1,
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => onClick(card)}
    >
      {/* Image or gradient background */}
      <img
        src={card.src}
        alt={card.title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Bottom gradient for text legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          transition: 'opacity 0.3s ease',
          opacity: isHovered ? 1 : 0.6,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1.25rem',
          transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'transform 0.3s ease',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: '4px',
          }}
        >
          {card.kind}
        </span>
        <p
          style={{
            color: 'white',
            fontWeight: 700,
            fontSize: '1.1rem',
            lineHeight: 1.3,
            margin: 0,
          }}
        >
          {card.title}
        </p>
      </div>
    </div>
  )
}

/* ─── FocusCards Grid ─────────────────────────────────────── */

export function FocusCards({ cards, onCardClick, columns = 3 }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '1rem',
      }}
    >
      {cards.map((card, i) => (
        <Card
          key={card.title}
          card={card}
          index={i}
          hovered={hovered}
          setHovered={setHovered}
          onClick={onCardClick}
        />
      ))}
    </div>
  )
}
