import { useEffect, useRef } from 'react'

// Fundalul paginii de login: decorul din meniul lateral (SidebarDecor din AppSidebar.tsx) intins pe tot
// ecranul — degrade inchis, grila de puncte, lumini albastre/turcoaz/mov care plutesc lent, stele care
// sclipesc si liniile ondulate din meniu (albastru, mov, verde punctat care curge, albastru punctat invers).
// Efecte: sub cursor se aprind (fin) punctele grilei si scantei in culorile logo-ului
// care urca incet. Cu animatiile oprite: fara stele si scantei, lumina sta in centru.

// scanteile: pozitie, culoare (verde / albastru / mov), durata, intarziere, deriva laterala
const SCANTEI = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 2 + (i % 3),
  cul: ['#00e07a', '#3d8bff', '#a66bff'][i % 3],
  durata: `${14 + ((i * 7) % 11)}s`,
  intarziere: `${-((i * 3.3) % 18).toFixed(1)}s`,
  deriva: `${((i % 5) - 2) * 22}px`,
}))

const STELE = [
  { left: '7%', top: '22%', size: 2, delay: '2.3s' },
  { left: '18%', top: '64%', size: 3, delay: '.6s' },
  { left: '31%', top: '12%', size: 2, delay: '1.7s' },
  { left: '44%', top: '86%', size: 3, delay: '2.9s' },
  { left: '58%', top: '30%', size: 2, delay: '3.4s' },
  { left: '67%', top: '72%', size: 2, delay: '1.1s' },
  { left: '79%', top: '16%', size: 3, delay: '2.1s' },
  { left: '88%', top: '55%', size: 2, delay: '.3s' },
  { left: '94%', top: '90%', size: 2, delay: '1.9s' },
  { left: '3%', top: '92%', size: 2, delay: '2.6s' },
  { left: '24%', top: '38%', size: 2, delay: '3.1s' },
  { left: '72%', top: '44%', size: 2, delay: '.9s' },
]

export function FundalLogin({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // lumina urmareste cursorul (fara re-randare: doar doua variabile CSS)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const muta = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', muta)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', muta)
    }
  }, [reduced])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ ['--mx' as string]: '50vw', ['--my' as string]: '42vh' }}>
      {/* baza: mai inchisa, ca culorile sa iasa in evidenta (contrast) */}
      <span className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #060a17 0%, #03050b 50%, #070418 100%)' }} />
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(96,165,250,.3) 1px, transparent 1.3px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,.55) 0%, rgba(0,0,0,.18) 45%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 80%, rgba(0,0,0,.55) 0%, rgba(0,0,0,.18) 45%, rgba(0,0,0,0) 75%)',
        }}
      />
      {/* lumini colorate, saturate si concentrate (nu un val deschis peste tot) */}
      <span
        className="absolute -left-[8vw] -top-[12vh] size-[36vmax] animate-[orbDrift_14s_ease-in-out_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(29,78,216,.32) 0%, rgba(29,78,216,.1) 38%, rgba(29,78,216,0) 62%)' }}
      />
      <span
        className="absolute -bottom-[22vh] -right-[12vw] size-[52vmax] animate-[orbDrift_18s_ease-in-out_-6s_infinite_reverse] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,.5) 0%, rgba(109,40,217,.16) 36%, rgba(109,40,217,0) 60%)' }}
      />
      <span
        className="absolute -bottom-[14vh] left-[18vw] size-[26vmax] animate-[orbDrift_22s_ease-in-out_-9s_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,168,72,.16) 0%, rgba(0,168,72,0) 62%)' }}
      />
      {/* vigneta: marginile mai intunecate -> mai mult contrast */}
      <span className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,.55) 100%)' }} />
      {/* sub cursor se aprind doar punctele grilei (fara val de lumina) */}
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(61,139,255,.75) 1px, transparent 1.4px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(200px circle at var(--mx) var(--my), rgba(0,0,0,.55), transparent 80%)',
          WebkitMaskImage: 'radial-gradient(200px circle at var(--mx) var(--my), rgba(0,0,0,.55), transparent 80%)',
        }}
      />
      {/* liniile ondulate din meniul lateral, pe toata latimea, in partea de jos */}
      <svg viewBox="0 0 1440 900" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="lgL1" x1="0" x2="1">
            <stop offset="0" stopColor="#3d8bff" stopOpacity="0" />
            <stop offset=".5" stopColor="#3d8bff" stopOpacity=".65" />
            <stop offset="1" stopColor="#b26bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lgL2" x1="0" x2="1">
            <stop offset="0" stopColor="#b26bff" stopOpacity="0" />
            <stop offset=".5" stopColor="#b26bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#00f5a0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-20 640 C 300 560, 620 760, 960 640 S 1300 560, 1460 620" fill="none" stroke="url(#lgL1)" strokeWidth="1.4" />
        <path d="M-20 690 C 340 610, 660 810, 1000 690 S 1320 610, 1460 670" fill="none" stroke="url(#lgL2)" strokeWidth="1.2" />
        <path
          d="M-20 740 C 380 660, 700 860, 1040 740 S 1340 660, 1460 720"
          fill="none"
          stroke="rgba(0,245,160,.32)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          style={{ animation: 'dashFlow 3s linear infinite' }}
        />
        <path
          d="M-20 790 C 420 720, 740 900, 1080 790 S 1360 720, 1460 770"
          fill="none"
          stroke="rgba(96,165,250,.28)"
          strokeWidth="1"
          strokeDasharray="2 10"
          style={{ animation: 'dashFlow 4.5s linear infinite reverse' }}
        />
        <path d="M-20 840 C 360 790, 780 920, 1120 840 S 1380 790, 1460 820" fill="none" stroke="rgba(178,107,255,.26)" strokeWidth="1" />
      </svg>
      {!reduced &&
        SCANTEI.map((p, i) => (
          <span
            key={i}
            className="login-scanteie absolute -bottom-3 rounded-full"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.cul,
              boxShadow: `0 0 8px 2px ${p.cul}`,
              ['--durata' as string]: p.durata,
              ['--intarziere' as string]: p.intarziere,
              ['--deriva' as string]: p.deriva,
            }}
          />
        ))}
      {!reduced &&
        STELE.map((t) => (
          <span
            key={`${t.left}-${t.top}`}
            className="absolute animate-[twinkle_3.2s_ease-in-out_infinite] rounded-full bg-[#dbeafe]"
            style={{
              left: t.left,
              top: t.top,
              width: t.size,
              height: t.size,
              animationDelay: t.delay,
              boxShadow: '0 0 6px 1px rgba(191,219,254,.9)',
            }}
          />
        ))}
    </div>
  )
}
