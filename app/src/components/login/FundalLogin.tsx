// Fundalul paginii de login: decorul din meniul lateral (SidebarDecor din AppSidebar.tsx) — degrade
// inchis, grila de puncte, lumini turcoaz/albastre/mov care plutesc si stele care sclipesc — intins pe
// tot ecranul. Liniile (albastru, mov, verde punctat) sunt acum legaturile dintre dosare (ReteaDosare).

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
]

export function FundalLogin({ reduced }: { reduced: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <span className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0a1224 0%, #070b14 45%, #0b0a1c 100%)' }} />
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(96,165,250,.26) 1px, transparent 1.3px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse at 60% 75%, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 60% 75%, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,0) 75%)',
        }}
      />
      <span
        className="absolute -left-[12vw] -top-[18vh] size-[55vmax] animate-[orbDrift_14s_ease-in-out_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,.24) 0%, rgba(37,99,235,0) 66%)' }}
      />
      <span
        className="absolute -left-[20vw] top-[35%] size-[40vmax] animate-[orbDrift_20s_ease-in-out_-4s_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,194,255,.16) 0%, rgba(34,194,255,0) 66%)' }}
      />
      <span
        className="absolute -bottom-[25vh] -right-[15vw] size-[60vmax] animate-[orbDrift_18s_ease-in-out_-6s_infinite_reverse] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,.38) 0%, rgba(124,58,237,0) 64%)' }}
      />
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
