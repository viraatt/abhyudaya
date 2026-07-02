import { useEffect } from 'react'
import './EventModal.css'

export default function EventModal({ event, onClose }) {
  useEffect(() => {
    if (!event) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [event, onClose])

  if (!event) return null

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="event-modal__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3L13 13M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="event-modal__header">
          <span className="eyebrow">{event.kind}</span>
          <h2 id="event-modal-title">{event.name}</h2>
          <p>{event.detail}</p>
        </div>

        <div className="event-modal__list">
          {event.subEvents.map((sub) => (
            <div className="event-modal__item" key={sub.slug}>
              <span className="eyebrow">{sub.kind}</span>
              <h3>{sub.name}</h3>
              <p>{sub.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}