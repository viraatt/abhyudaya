import { createContext, useContext, useRef, useState } from 'react'

/* ─── Shared context so CardItem knows when mouse is inside ── */
const MouseEnterContext = createContext([false, () => {}])

/* ─── CardContainer ──────────────────────────────────────────
   Wraps everything. Handles mouse tracking + CSS perspective.
   containerClassName → the outer div (grid col-span goes here)
   className          → the inner rotating div
*/
export function CardContainer({ children, className = '', containerClassName = '', onClick }) {
  const containerRef = useRef(null)
  const [isMouseEntered, setIsMouseEntered] = useState(false)

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - left - width / 2) / 20
    const y = (e.clientY - top - height / 2) / 20
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`
  }

  const handleMouseEnter = () => setIsMouseEntered(true)

  const handleMouseLeave = () => {
    setIsMouseEntered(false)
    if (containerRef.current) {
      containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)'
    }
  }

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={containerClassName}
        style={{ perspective: '1000px' }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <div
          ref={containerRef}
          className={className}
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.12s ease-out',
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  )
}

/* ─── CardBody ───────────────────────────────────────────────
   Direct child of CardContainer. Holds all CardItems.
*/
export function CardBody({ children, className = '', style, onClick }) {
  return (
    <div
      className={className}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/* ─── CardItem ───────────────────────────────────────────────
   Any element that should float at a given Z depth.
   translateZ → how far it pops forward (px). Higher = closer.
*/
export function CardItem({
  as: Tag = 'div',
  children,
  className = '',
  translateZ = 0,
  style,
  ...rest
}) {
  const [isMouseEntered] = useContext(MouseEnterContext)

  return (
    <Tag
      className={className}
      style={{
        ...style,
        transform: isMouseEntered
          ? `translateZ(${translateZ}px)`
          : 'translateZ(0px)',
        transition: 'transform 0.3s ease-out',
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
