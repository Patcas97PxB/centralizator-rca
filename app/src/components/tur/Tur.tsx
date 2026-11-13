import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BellRing,
  Calculator,
  CalendarClock,
  Car,
  ChartColumn,
  CircleCheck,
  Coins,
  Download,
  FileCheck,
  FilePen,
  FileText,
  FileWarning,
  FolderOpen,
  GraduationCap,
  History,
  LayoutGrid,
  ListChecks,
  Mail,
  MousePointerClick,
  NotebookPen,
  PanelRight,
  Phone,
  Plus,
  ScanText,
  Search,
  StickyNote,
  Store,
  SunMoon,
  Timer,
  Workflow,
  Wrench,
} from 'lucide-react'
import { laPornireTur, marcheazaTurVazut, puneStareTur, turVazut } from '@/lib/tur'
import { cn } from '@/lib/utils'
import type { SectionKey } from '@/components/layout/nav-items'

// Tutorialul interactiv: la prima intrare întreabă „Vrei un tutorial?”, apoi trece pe rând prin
// butoanele reale ale aplicației — restul ecranului se întunecă, butonul rămâne luminat (și „respiră”
// ușor = zoom), o săgeată îl arată, iar lângă el apare explicația. Țintele sunt elementele cu
// `data-tur="…"`; dacă una nu e pe ecran (telefon, listă goală) se ia următoarea din listă sau pasul
// se arată în centru. Nu schimbă nimic în dosare.

type Loc = 'sus' | 'jos' | 'stanga' | 'dreapta'
interface Pas {
  /** capitolul din care face parte (apare deasupra titlului) */
  capitol: string
  /** valori `data-tur`, în ordinea preferinței; prima vizibilă e ținta */
  tinte: string[]
  icon: typeof Plus
  titlu: string
  text: (tinta: string | null, telefon: boolean) => ReactNode
  /** amănunte, ca listă scurtă sub text */
  detalii?: ReactNode[]
  /** pagina pe care se arată pasul (implicit Dosare) */
  pagina?: SectionKey
  /** un exemplu concret, într-o casetă sub text (la unelte) */
  exemplu?: ReactNode
  /** butoanele mici „respiră” (zoom); zonele mari doar se luminează */
  zoom?: boolean
  /** pasul se arată cu panoul lateral al primului dosar de exemplu deschis */
  panou?: boolean
}

const Punct = ({ culoare, children }: { culoare: string; children: ReactNode }) => (
  <span className="flex items-center gap-2">
    <span className="size-2.5 shrink-0 rounded-full" style={{ background: culoare }} />
    <span>{children}</span>
  </span>
)

const PASI: Pas[] = [
  // ── Pagina Dosare ──
  {
    capitol: 'Dosare',
    tinte: ['nou'],
    icon: Plus,
    titlu: 'Dosar nou',
    zoom: true,
    text: () => <>De aici adaugi un dosar. Formularul e împărțit pe pași, în ordinea în care lucrezi:</>,
    detalii: [
      <>
        <b>Dosar</b> (asigurator, nr. dosar, RBH) · <b>Mașina păgubită</b> · <b>Mașina de înlocuire</b> · <b>Client și service</b> ·{' '}
        <b>Termen</b> · <b>Note</b>
      </>,
      <>Ce scrii se salvează cu MAJUSCULE, iar nr. auto și RBH-ul sunt aduse singure la același format.</>,
      <>Dacă există deja un dosar cu același număr, te avertizează înainte să salvezi.</>,
      <>
        Un dosar nou intră la <b>De predat</b>, cu predarea azi.
      </>,
    ],
  },
  {
    capitol: 'Dosare',
    tinte: ['nou'],
    icon: ScanText,
    titlu: 'PRELUARE DATE — nu mai scrii de mână',
    zoom: true,
    text: () => (
      <>
        În formular ai <b>PRELUARE DATE</b>: încarci documentele și aplicația le citește și completează câmpurile în locul tău.
      </>
    ),
    detalii: [
      <>Nota de constatare, PV-ul sau devizul — PDF, scan sau poză făcută cu telefonul, mai multe fișiere odată.</>,
      <>
        Completează <b>nr. dosar, nr. auto, marca și modelul, asiguratorul și proprietarul</b>.
      </>,
      <>Din deviz calculează singură zilele de lucru, iar clasa mașinii e sugerată după marcă.</>,
      <>Verifici ce a citit și corectezi dacă e cazul, apoi salvezi.</>,
    ],
  },
  {
    capitol: 'Dosare',
    tinte: ['filtre'],
    icon: Search,
    titlu: 'Caută și filtrează',
    text: () => (
      <>
        Scrii nr. auto, nr. dosar, RBH sau service-ul și rămân doar dosarele potrivite. Nr. auto îl poți scrie oricum: „BH 01 EXE” sau
        „bh01exe”.
      </>
    ),
    detalii: [
      <>
        <b>Filtre avansate</b>: perioadă, service, data predării și sortare (prioritate, zile rămase sau nr. dosar).
      </>,
      <>
        Tot acolo: <b>Exportă lista filtrată în Excel</b>.
      </>,
      <>
        <b>Ale mele</b> arată doar dosarele la care ți-ai pus „Amintește-mi”.
      </>,
      <>
        Butonul <b>i</b> deschide legenda culorilor.
      </>,
    ],
  },
  {
    capitol: 'Dosare',
    tinte: ['azi'],
    icon: ListChecks,
    titlu: 'De făcut azi',
    text: () => <>Aplicația îți scoate singură în față ce cere atenție. Un click pe o etichetă arată doar acele dosare; încă un click o scoate.</>,
    detalii: [
      <>
        <b>De sunat</b> — clientul mai are cel mult 2 zile sau a depășit termenul.
      </>,
      <>
        <b>De trimis</b> — mașina e preluată de 2 zile și dosarul încă nu e închis.
      </>,
      <>
        <b>Fără deviz</b> — mașina e la client de 2 zile și nu ai zilele din deviz.
      </>,
      <>
        <b>Predări azi / mâine</b> și reminderele tale.
      </>,
    ],
  },
  {
    capitol: 'Dosare',
    tinte: ['etape'],
    icon: Workflow,
    titlu: 'Etapele dosarului',
    text: () => <>Fiecare dosar trece prin patru etape. Nu le alegi de mână — se schimbă singure când marchezi pasul următor. Filele arată câte dosare sunt în fiecare.</>,
    detalii: [
      <>
        <b>De predat</b> — mașina de înlocuire nu a plecat încă la client.
      </>,
      <>
        <b>La client</b> — predată; de aici curge termenul.
      </>,
      <>
        <b>De trimis</b> — mașina s-a întors; mai ai de strâns documentele și de trimis mailul.
      </>,
      <>
        <b>Finalizat</b> — dosar închis; coboară la sfârșitul listei.
      </>,
    ],
  },
  // ── Cardul (pe dosarele de exemplu) ──
  {
    capitol: 'Cardul dosarului',
    tinte: ['lista', 'gol'],
    icon: LayoutGrid,
    titlu: 'Culoarea = termenul',
    text: () => (
      <>
        Am pus câteva <b>dosare de exemplu</b>. Fiecare dosar e un card, iar culoarea spune cât de urgent e. Cele mai urgente stau
        mereu primele.
        <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          <Punct culoare="var(--st-red)">roșu — depășit / azi</Punct>
          <Punct culoare="var(--st-blue)">albastru — de predat</Punct>
          <Punct culoare="var(--st-amber)">galben — 1–2 zile</Punct>
          <Punct culoare="var(--st-violet)">mov — de trimis</Punct>
          <Punct culoare="var(--st-green)">verde — 3+ zile</Punct>
          <Punct culoare="var(--st-gray)">gri — finalizat</Punct>
        </span>
      </>
    ),
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-cine'],
    icon: Car,
    titlu: 'Ce mașini sunt',
    text: () => (
      <>
        Stânga e <b>mașina păgubită</b>, după săgeată <b>mașina de înlocuire</b> dată clientului. Dedesubt, marca și modelul fiecăreia.
      </>
    ),
    detalii: [
      <>Poza e a mașinii de înlocuire, ca s-o recunoști dintr-o privire. Dacă n-ai ales încă una, apare o siluetă gri.</>,
      <>
        Rândul următor: <b>asiguratorul · nr. dosar · nr. rezervare (RBH)</b>.
      </>,
    ],
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-termen'],
    icon: Timer,
    titlu: 'Termenul',
    text: () => (
      <>
        Câte zile mai are clientul mașina — sau cu câte a depășit. Dedesubt: data predării, <b>ziua X din Y</b> și data până la care
        trebuie preluată.
      </>
    ),
    detalii: [
      <>
        Se calculează singur. La o mașină deplasabilă: <b>zilele din deviz + weekendul și zilele libere + 1 zi de intrare-ieșire</b>.
      </>,
      <>Înainte de predare scrie „X zile până la predare”; după preluare, „Preluată · închide contractul”.</>,
      <>Dacă scrii tu de mână data preluării, aceea devine termenul.</>,
    ],
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-etapa', 'c-dosar'],
    icon: BellRing,
    titlu: 'Etapa și „Amintește-mi”',
    zoom: true,
    text: () => (
      <>
        Pastila arată etapa. Apasă pe ea și alegi <b>Amintește-mi…</b> — un reminder pus de tine pe dosarul ăsta.
      </>
    ),
    detalii: [
      <>
        <b>Când</b>: azi, mâine, peste 2 zile, peste o săptămână sau la o dată aleasă.
      </>,
      <>
        <b>Ce</b>: sună clientul, sună service-ul, trimite mailul, verifică devizul — sau scrii tu.
      </>,
      <>În ziua aceea dosarul apare în clopoțel și la „De făcut azi”. Când ai terminat: „Gata, scoate reminderul”.</>,
    ],
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-lipsuri'],
    icon: FileWarning,
    titlu: 'Documentele lipsă',
    text: () => <>Vezi direct ce mai lipsește din dosar, fără să-l deschizi. Când sunt toate, rândul devine verde: „Toate documentele”.</>,
    detalii: [
      <>
        Se urmăresc: <b>NC, deviz, documentele păgubitului și ale vinovatului, amiabila / PV poliție, CC, CD, contractul final, PV
        predare/primire, documentul de intrare-ieșire</b>.
      </>,
      <>Un document care nu e cazul îl marchezi „nu se aplică” și nu mai apare la lipsuri.</>,
    ],
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-note'],
    icon: StickyNote,
    titlu: 'Observațiile, la vedere',
    text: () => (
      <>
        Ce notezi la un dosar — ce ai vorbit cu clientul, ce a promis service-ul — apare <b>direct pe card</b>, ca să nu-l deschizi de
        fiecare dată.
      </>
    ),
  },
  {
    capitol: 'Cardul dosarului',
    tinte: ['c-buton', 'c-pas'],
    icon: MousePointerClick,
    titlu: 'Butonul pasului următor',
    zoom: true,
    text: (tinta) => (
      <>
        Un singur buton duce dosarul mai departe. Liniile din stânga arată la ce etapă e.
        {tinta === 'c-pas' && ' Butonul apare pe calculator; pe telefon pasul se face din panoul dosarului.'}
      </>
    ),
    detalii: [
      <>
        <b>Marchează predat</b> — clientul a plecat cu mașina; începe termenul.
      </>,
      <>
        <b>Marchează preluat</b> — mașina s-a întors; dosarul trece la „De trimis”.
      </>,
      <>
        <b>Finalizează</b> — închide dosarul. Dacă lipsesc documente, te întreabă întâi dacă vrei să-l închizi fără ele.
      </>,
      <>Ai apăsat din greșeală? Pasul se anulează din panoul dosarului.</>,
    ],
  },
  // ── Panoul lateral ──
  {
    capitol: 'Panoul dosarului',
    tinte: ['panou'],
    icon: PanelRight,
    titlu: 'Click pe card = toate detaliile',
    panou: true,
    text: () => (
      <>
        Un click oriunde pe card deschide panoul dosarului. Aici e tot ce ține de el, pe secțiuni. Le luăm pe rând; se închide din X.
      </>
    ),
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-termen'],
    icon: Timer,
    titlu: 'Termen și etape',
    panou: true,
    text: () => <>Aceleași zile ca pe card, dar cu socoteala la vedere și cu data fiecărei etape.</>,
    detalii: [
      <>Sub bară scrie cum s-a ajuns la număr: zilele din deviz, weekendul, ziua de intrare-ieșire.</>,
      <>
        <b>Anulează predarea / preluarea</b> sau <b>Redeschide dosarul</b> — dai înapoi câte un pas, dacă ai marcat greșit.
      </>,
    ],
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-documente'],
    icon: FileCheck,
    titlu: 'Documentele dosarului',
    panou: true,
    text: () => (
      <>
        Lista completă: cele care lipsesc sunt primele, cele pe care le ai au bifă verde. Butonul <b>Documente</b> deschide fereastra
        unde le bifezi.
      </>
    ),
    detalii: [
      <>Alegi fișierul și aplicația ține minte că îl ai. Fișierul rămâne la tine pe calculator, nu se urcă nicăieri.</>,
      <>
        Din <b>contractul final</b> citește singură zilele și valoarea — de aici vin sumele din Rapoarte.
      </>,
      <>Verifică și dacă e contractul dosarului potrivit; unul greșit e respins.</>,
    ],
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-client'],
    icon: Phone,
    titlu: 'Client și service',
    panou: true,
    text: () => <>Proprietarul mașinii, telefonul clientului și service-ul cu telefonul lui — le ai la îndemână când trebuie să suni.</>,
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-observatii'],
    icon: StickyNote,
    titlu: 'Observații',
    panou: true,
    text: () => (
      <>
        Scrii direct aici ce ai vorbit cu clientul sau cu service-ul. Se salvează singur când ieși din câmp și <b>se vede pe card</b>.
      </>
    ),
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-reminder'],
    icon: BellRing,
    titlu: 'Amintește-mi, și din panou',
    panou: true,
    text: () => <>Același reminder ca din pastila de pe card: vezi ce ai pus, îl schimbi sau îl scoți cu „Gata”.</>,
  },
  {
    capitol: 'Panoul dosarului',
    tinte: ['p-jos'],
    icon: Wrench,
    titlu: 'Unelte direct pe dosar',
    panou: true,
    text: () => <>Partea de jos rămâne mereu la vedere, oricât ai derula:</>,
    detalii: [
      <>
        <b>Zile din deviz</b> și câte zile sunt decontabile.
      </>,
      <>
        <b>Verificare tarif</b>, <b>Doc. intrare/ieșire</b> și <b>Mail</b> — se deschid deja completate cu datele dosarului.
      </>,
      <>
        <b>Editează</b> deschide formularul întreg, iar butonul albastru face pasul următor.
      </>,
    ],
  },
  {
    capitol: 'Dosare',
    tinte: ['clopotel'],
    icon: Bell,
    titlu: 'Clopoțelul',
    zoom: true,
    text: () => <>Cifra roșie arată câte dosare cer ceva de la tine. Un click pe un rând te duce direct la cardul lui.</>,
    detalii: [
      <>
        Apar singure: <b>termene aproape sau depășite</b>, dosare <b>preluate și netrimise</b>, mașini la client <b>fără deviz</b>.
      </>,
      <>Plus reminderele tale, din ziua pe care ai ales-o.</>,
      <>
        Fila <b>Ale mele</b> arată toate reminderele, și pe cele viitoare; le amâni cu „+1 zi” sau le închizi cu ✓.
      </>,
    ],
  },
  // ── Uneltele, una câte una ──
  {
    capitol: 'Unelte',
    tinte: ['unelte'],
    icon: Wrench,
    titlu: 'Uneltele',
    text: (_t, telefon) =>
      telefon ? (
        <>
          Uneltele te scapă de calculele făcute de mână. Pe telefon ai jos <b>Zile din deviz</b> și <b>Modificare PDF</b>; restul
          sunt la lupa din antet. Le luăm pe rând.
        </>
      ) : (
        <>
          Uneltele te scapă de calculele și documentele făcute de mână. Merg și <b>fără dosar</b> — de exemplu când te sună un
          client și vrei doar un răspuns rapid. Le luăm pe rând.
        </>
      ),
  },
  {
    capitol: 'Unelte',
    tinte: ['u-deviz'],
    icon: Calculator,
    titlu: 'Zile din deviz',
    zoom: true,
    text: () => (
      <>
        Încarci devizul și aplicația citește orele de manoperă și de vopsitorie și îți dă <b>zilele de lucru</b>, cu socoteala
        afișată.
      </>
    ),
    detalii: [
      <>Merge cu PDF, scan sau poze; poți alege toate paginile odată.</>,
      <>Cunoaște devizele Audatex și GT Estimate. La poze, să se vadă pagina cu totalurile.</>,
      <>
        Din rezultat: <b>Aplică pe dosar nou</b> deschide formularul cu zilele deja puse.
      </>,
    ],
    exemplu: (
      <>
        30,30 ore în deviz → <b>8 zile</b> (4 ore = 1 zi)
      </>
    ),
  },
  {
    capitol: 'Unelte',
    tinte: ['u-tarif'],
    icon: Coins,
    titlu: 'Verificare tarif',
    zoom: true,
    text: () => (
      <>
        Alegi asiguratorul, clasa mașinii și zilele și primești <b>prețul pe zi și totalul după grilă</b>, cu și fără TVA.
      </>
    ),
    detalii: [
      <>
        Pui și <b>valoarea de pe contract</b>: îți spune dacă corespunde grilei sau unde e diferența — tarif greșit sau alt număr de
        zile.
      </>,
      <>
        <b>Din dosar</b> completează singură asiguratorul, clasa și zilele.
      </>,
      <>Allianz e în lei, ceilalți asiguratori în EUR.</>,
    ],
    exemplu: <>„Corespunde grilei” sau „Tarif greșit pe contract”, cu diferența calculată</>,
  },
  {
    capitol: 'Unelte',
    tinte: ['u-date'],
    icon: CalendarClock,
    titlu: 'Calculator de date',
    zoom: true,
    text: () => (
      <>
        Pentru clientul de la telefon: pui data predării, zilele din deviz și asiguratorul și afli <b>până când poate ține mașina</b>,
        după aceeași regulă ca pe card.
      </>
    ),
    detalii: [
      <>Îți arată și câte zile sunt decontabile și câte mai are.</>,
      <>
        Fila <b>Zile între două date</b> numără zilele dintr-o perioadă.
      </>,
    ],
    exemplu: <>„Preluare cel târziu: miercuri, 04.11.2026”</>,
  },
  {
    capitol: 'Unelte',
    tinte: ['u-mail'],
    icon: Mail,
    titlu: 'Creare mail',
    zoom: true,
    text: () => (
      <>
        Alegi dosarul și primești <b>subiectul și textul mailului gata scrise</b>, după modelul obișnuit: dosar, model mașină,
        proprietar, starea mașinii.
      </>
    ),
    detalii: [
      <>
        Documentele pe care le ai apar la <b>„Am atașat”</b>, cele lipsă la <b>„Necesar”</b>. Un click pe un document îl mută.
      </>,
      <>
        <b>Copiază textul</b> și îl lipești în mail, cu formatarea păstrată. Destinatarii îi pui tu.
      </>,
      <>Merge și fără dosar, cu câmpurile completate de mână.</>,
    ],
    exemplu: <>Subiect: BH01EXE/ RCA/ HDR 100001/ ASIGURATOR ORAȘ</>,
  },
  {
    capitol: 'Unelte',
    tinte: ['u-docii'],
    icon: FileText,
    titlu: 'Document intrare/ieșire',
    zoom: true,
    text: () => (
      <>
        Completează singur <b>documentul de intrare/ieșire din service</b>: client, mașină, nr. auto, data intrării și a ieșirii.
      </>
    ),
    detalii: [
      <>
        Datele vin din dosar și din contract; <b>Citește din contract</b> ia clientul și datele reale.
      </>,
      <>Poți corecta orice câmp înainte să descarci.</>,
      <>Se descarcă PDF, cu „de semnat” în nume, ca să știi că nu e încă semnat de service.</>,
    ],
  },
  {
    capitol: 'Unelte',
    tinte: ['u-pdf'],
    icon: FilePen,
    titlu: 'Modificare PDF',
    zoom: true,
    text: () => <>Corectezi un PDF direct în browser, fără alt program.</>,
    detalii: [
      <>
        <b>Schimbi un text</b> — o dată, un număr — și noul text apare cu același font și aceeași mărime.
      </>,
      <>
        <b>Separă pagini</b>: bifezi paginile dorite și le salvezi într-un PDF nou.
      </>,
      <>Originalul rămâne neatins; primești o copie. Textul se poate schimba doar în PDF-uri cu text, nu în scanări.</>,
    ],
  },
  {
    capitol: 'Unelte',
    tinte: ['nav-notite'],
    icon: NotebookPen,
    titlu: 'Notițe',
    zoom: true,
    text: () => <>Carnețelul tău de lângă telefon: notezi repede ce ai vorbit, fără să cauți dosarul.</>,
    detalii: [
      <>
        Scrii o bucată din <b>nr. auto</b> și îți propune dosarele potrivite.
      </>,
      <>Notița se adaugă singură la observațiile acelui dosar, cu data.</>,
      <>Poți pune „Amintește-mi” și pe o notiță.</>,
    ],
    exemplu: <>„BH01EXE — posibil gata joi” → apare la dosarul BH01EXE</>,
  },
  {
    capitol: 'Unelte',
    tinte: ['cautare-rapida'],
    icon: Search,
    titlu: 'Căutare rapidă',
    zoom: true,
    text: (_t, telefon) =>
      telefon ? (
        <>
          Lupa găsește orice dosar după nr. auto, nr. dosar sau RBH și te duce la cardul lui. Cu câmpul gol îți arată{' '}
          <b>toate uneltele</b>.
        </>
      ) : (
        <>
          <b>Ctrl + K</b> de oriunde, de pe orice pagină: scrii nr. auto, nr. dosar sau RBH, apeși Enter și ești la cardul dosarului.
          Cu câmpul gol îți arată toate uneltele.
        </>
      ),
  },
  // ── Restul meniului ──
  {
    capitol: 'Meniu',
    tinte: ['nav-servicii'],
    icon: Store,
    titlu: 'Service-uri',
    zoom: true,
    text: () => (
      <>
        Lista service-urilor cu care lucrezi, cu telefon. Le adaugi o dată și apoi le <b>alegi din listă</b> în dosar, la filtre și în
        mail.
      </>
    ),
  },
  {
    capitol: 'Meniu',
    tinte: ['nav-rapoarte'],
    icon: ChartColumn,
    titlu: 'Rapoarte',
    zoom: true,
    text: () => <>Partea de bani și de evidență, pe perioada și service-ul alese.</>,
    detalii: [
      <>
        <b>Statistici</b>: câte dosare ai, câte sunt finalizate, service-ul și asiguratorul cu cele mai multe.
      </>,
      <>
        <b>Valorile contractelor</b>, cu totaluri separate în EUR și în lei.
      </>,
      <>
        Fiecare contract e comparat cu grila; ce nu se potrivește e marcat <b>„Tarif de verificat”</b>.
      </>,
      <>
        <b>Activitate recentă</b> și export în Excel sau CSV.
      </>,
    ],
  },
  // ── Setări (turul deschide pagina) ──
  {
    capitol: 'Setări',
    pagina: 'setari',
    tinte: ['s-folder', 'nav-setari'],
    icon: FolderOpen,
    titlu: 'Folderul de pe laptop',
    text: () => (
      <>
        Am deschis <b>Setări</b>. Dacă ții pe laptop un folder cu câte un subfolder pe dosar, numit după nr. auto, îl alegi aici o
        singură dată.
      </>
    ),
    detalii: [
      <>Aplicația citește doar numele fișierelor și bifează singură documentele pe care le ai.</>,
      <>Nu încarcă și nu modifică nimic.</>,
      <>Merge în Chrome sau Edge, pe calculator. La pornirea browserului ți se cere din nou voie, cu un click.</>,
    ],
  },
  {
    capitol: 'Setări',
    pagina: 'setari',
    tinte: ['s-backup'],
    icon: Download,
    titlu: 'Backup',
    text: () => (
      <>
        <b>Exportă backup</b> salvează un fișier cu toate dosarele și service-urile. <b>Importă backup</b> le aduce înapoi dintr-un
        astfel de fișier.
      </>
    ),
    detalii: [<>Dacă au trecut 3 zile de la ultimul backup, pe „Setări” apare un punct galben.</>],
  },
  {
    capitol: 'Setări',
    pagina: 'setari',
    tinte: ['s-recuperare'],
    icon: History,
    titlu: 'Recuperare',
    text: () => (
      <>
        Ai șters un dosar din greșeală sau l-ai modificat aiurea? De aici îl aduci înapoi: dosarele șterse se păstrează 180 de zile,
        iar pentru fiecare dosar ultimele 20 de versiuni.
      </>
    ),
  },
  {
    capitol: 'Setări',
    pagina: 'setari',
    tinte: ['s-aspect'],
    icon: SunMoon,
    titlu: 'Aspect',
    text: () => <>Alegi tema Dark sau Light, după cum îți e mai comod. Se ține minte pe browserul ăsta.</>,
  },
  {
    capitol: 'Setări',
    pagina: 'setari',
    tinte: ['tutorial'],
    icon: GraduationCap,
    titlu: 'Tutorialul, oricând',
    zoom: true,
    text: () => <>Vrei să-l revezi sau să i-l arăți unui coleg? Butonul ăsta îl pornește din nou, de pe orice pagină.</>,
  },
]

const vizibil = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}
function gasesteTinta(pas: Pas): { el: HTMLElement; nume: string } | null {
  for (const nume of pas.tinte) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tur="${nume}"]`)) {
      if (vizibil(el)) return { el, nume }
    }
  }
  return null
}

interface Zona {
  top: number
  left: number
  width: number
  height: number
}
const MARGINE = 12 // distanța minimă a explicației față de marginea ecranului
const SPATIU = 46 // locul săgeții, între țintă și explicație
const LUMINA = 6 // cu cât e mai mare zona luminată decât butonul

interface Asezare {
  loc: Loc
  top: number
  left: number
  w: number
  h: number
  /** explicația stă peste zona luminată (nu a încăput lângă ea) — fără săgeată */
  peste?: boolean
}
function asaza(z: Zona, w: number, h: number, vw: number, vh: number): Asezare {
  const incape: Record<Loc, boolean> = {
    jos: vh - (z.top + z.height) >= h + SPATIU + MARGINE,
    sus: z.top >= h + SPATIU + MARGINE,
    dreapta: vw - (z.left + z.width) >= w + SPATIU + MARGINE,
    stanga: z.left >= w + SPATIU + MARGINE,
  }
  // meniul lateral (îngust, lipit de stânga) → explicația în dreapta lui; altfel sub, apoi deasupra
  const lateral = z.left < 260 && z.width <= 260
  const ordine: Loc[] = lateral ? ['dreapta', 'jos', 'sus', 'stanga'] : ['jos', 'sus', 'dreapta', 'stanga']
  const cx = z.left + z.width / 2
  const cy = z.top + z.height / 2
  let loc = ordine.find((l) => incape[l])
  if (!loc) {
    // Nu încape lângă țintă (ecran scund, lista de carduri, panoul cât tot telefonul): explicația stă
    // PESTE zona luminată, fără săgeată — în colțul din dreapta-jos al ei la țintele late, altfel jos.
    const lat = z.width >= 2 * w + SPATIU && z.height >= h * 0.8
    return {
      loc: 'jos',
      // țintă mică: explicația merge în jumătatea de ecran în care NU e ținta, ca să n-o acopere
      top: Math.max(MARGINE, Math.min(lat ? z.top + z.height - h - 10 : cy < vh / 2 ? vh - h - MARGINE : MARGINE, vh - h - MARGINE)),
      // la o bandă lată (file, etichete) conținutul e în stânga — explicația se duce în dreapta ei
      left: Math.max(MARGINE, Math.min(lat || z.width > w * 1.5 ? z.left + z.width - w - 10 : cx - w / 2, vw - w - MARGINE)),
      w,
      h,
      peste: true,
    }
  }
  let top = loc === 'jos' ? z.top + z.height + SPATIU : loc === 'sus' ? z.top - SPATIU - h : cy - h / 2
  let left = loc === 'dreapta' ? z.left + z.width + SPATIU : loc === 'stanga' ? z.left - SPATIU - w : cx - w / 2
  top = Math.max(MARGINE, Math.min(top, vh - h - MARGINE))
  left = Math.max(MARGINE, Math.min(left, vw - w - MARGINE))
  return { loc, top, left, w, h }
}

const SAGEATA: Record<Loc, typeof ArrowUp> = { jos: ArrowUp, sus: ArrowDown, dreapta: ArrowLeft, stanga: ArrowRight }
const BTN_PRIMAR =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
const BTN_SECUNDAR =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-3.5 text-[13.5px] font-bold text-foreground transition-colors hover:bg-surface-hover'
const BTN_TEXT = 'h-10 rounded-lg px-2 text-[13px] font-semibold text-tx-3 transition-colors hover:text-foreground'

type Faza = 'inchis' | 'intrebare' | 'final' | number

export function Tur({
  gata,
  onDosare,
  onPagina,
  onNou,
}: {
  /** datele s-au încărcat */
  gata: boolean
  onDosare: () => void
  /** turul schimbă pagina când pasul e pe alta (Setări) */
  onPagina: (p: SectionKey) => void
  onNou: () => void
}) {
  const [faza, setFaza] = useState<Faza>('inchis')
  const [zona, setZona] = useState<Zona | null>(null)
  const [numeTinta, setNumeTinta] = useState<string | null>(null)
  const [loc, setLoc] = useState<Asezare | null>(null)
  const cutie = useRef<HTMLDivElement>(null)
  const primar = useRef<HTMLButtonElement>(null)
  const intrebat = useRef(false)

  // Prima intrare: întrebarea apare o singură dată, după ce s-au încărcat dosarele.
  useEffect(() => {
    if (!gata || intrebat.current || turVazut()) return
    intrebat.current = true
    const t = setTimeout(() => {
      // dacă e deja o fereastră deschisă (ex. a pornit direct un formular), nu ne băgăm peste ea
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      setFaza('intrebare')
    }, 700)
    return () => clearTimeout(t)
  }, [gata])

  useEffect(
    () =>
      laPornireTur(() => {
        onDosare()
        setFaza(0)
      }),
    [onDosare],
  )

  const inchide = useCallback(() => {
    marcheazaTurVazut()
    setFaza('inchis')
  }, [])
  const porneste = () => {
    onDosare()
    setFaza(0)
  }
  const inainte = useCallback(() => setFaza((f) => (typeof f === 'number' ? (f + 1 < PASI.length ? f + 1 : 'final') : f)), [])
  const inapoi = useCallback(() => setFaza((f) => (f === 'final' ? PASI.length - 1 : typeof f === 'number' && f > 0 ? f - 1 : f)), [])

  const pas = typeof faza === 'number' ? PASI[faza] : null

  // Cât rulează pașii, pagina Dosare arată dosarele de exemplu (și panoul, la pașii lui).
  const cuPanou = !!pas?.panou
  useEffect(() => {
    puneStareTur({ activ: typeof faza === 'number', panou: cuPanou })
  }, [faza, cuPanou])
  useEffect(() => () => puneStareTur({ activ: false, panou: false }), [])
  // Pagina pasului (Setări la ultimul capitol); la final și la închidere ne întoarcem pe Dosare.
  const pagina = pas ? (pas.pagina ?? 'dosare') : null
  const turPornit = useRef(false)
  useEffect(() => {
    if (pagina) {
      turPornit.current = true
      onPagina(pagina)
    } else if (turPornit.current && (faza === 'final' || faza === 'inchis')) {
      turPornit.current = false
      onPagina('dosare')
    }
  }, [pagina, faza, onPagina])
  const capitolUrmator = typeof faza === 'number' ? PASI.findIndex((p, k) => k > faza && p.capitol !== PASI[faza].capitol) : -1

  // Ținta pasului: o aducem pe ecran, o măsurăm și o urmărim (redimensionare, derulare, lista care se
  // încarcă). Butoanele mici primesc clasa de zoom cât timp sunt arătate.
  useLayoutEffect(() => {
    if (!pas) {
      setZona(null)
      setNumeTinta(null)
      return
    }
    let el: HTMLElement | null = null
    let viu = true
    const masoara = () => {
      if (!viu) return
      const g = gasesteTinta(pas)
      if (g?.el !== el) {
        el?.classList.remove('tur-zoom')
        el = g?.el ?? null
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
          if (pas.zoom) el.classList.add('tur-zoom')
        }
        setNumeTinta(g?.nume ?? null)
      }
      if (!el) return setZona(null)
      // Butoanele cu zoom își schimbă mărimea de pe ecran de câteva ori pe secundă; dacă am măsura-o așa,
      // zona luminată și explicația ar tremura odată cu ele (raportat 13.11.2026 la pașii de unelte:
      // „se mișcă caseta de text și nu se poate citi”). Luăm centrul (rămâne pe loc la zoom) și mărimea
      // reală a elementului, fără transformare, rotunjite la pixel.
      const b = el.getBoundingClientRect()
      const lat = el.offsetWidth || b.width
      const inalt = el.offsetHeight || b.height
      const r = { left: b.left + b.width / 2 - lat / 2, top: b.top + b.height / 2 - inalt / 2, right: b.left + b.width / 2 + lat / 2, bottom: b.top + b.height / 2 + inalt / 2 }
      // zona luminată nu iese din ecran (meniul lateral e înalt cât pagina)
      const top = Math.round(Math.max(4, r.top - LUMINA))
      const left = Math.round(Math.max(4, r.left - LUMINA))
      const z = {
        top,
        left,
        width: Math.round(Math.min(window.innerWidth - 4, r.right + LUMINA)) - left,
        height: Math.round(Math.min(window.innerHeight - 4, r.bottom + LUMINA)) - top,
      }
      // sub 2 px nu mutăm nimic: la zoom centrul iese cu jumătăți de pixel și rotunjirea ar sări între două valori
      const aproape = (a: number, b: number) => Math.abs(a - b) < 2
      setZona((v) => (v && aproape(v.top, z.top) && aproape(v.left, z.left) && aproape(v.width, z.width) && aproape(v.height, z.height) ? v : z))
    }
    masoara()
    const t = setInterval(masoara, 250)
    window.addEventListener('resize', masoara)
    window.addEventListener('scroll', masoara, true)
    return () => {
      viu = false
      clearInterval(t)
      window.removeEventListener('resize', masoara)
      window.removeEventListener('scroll', masoara, true)
      el?.classList.remove('tur-zoom')
    }
  }, [pas])

  // Locul explicației, după ce îi știm mărimea.
  useLayoutEffect(() => {
    const c = cutie.current
    if (!c || !zona) return setLoc(null)
    setLoc(asaza(zona, c.offsetWidth, c.offsetHeight, window.innerWidth, window.innerHeight))
  }, [zona, faza, numeTinta])

  useEffect(() => {
    if (faza === 'inchis') return
    primar.current?.focus({ preventScroll: true })
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        inchide()
      } else if (typeof faza === 'number' || faza === 'final') {
        if (e.key === 'ArrowRight' && faza !== 'final') inainte()
        else if (e.key === 'ArrowLeft') inapoi()
      }
    }
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [faza, inchide, inainte, inapoi])

  if (faza === 'inchis') return null

  const telefon = window.innerWidth < 768
  const centrat = !pas || !zona
  const Sageata = loc && !loc.peste ? SAGEATA[loc.loc] : null
  // săgeata stă în spațiul dintre explicație și țintă, în dreptul țintei
  const sageataStil = (() => {
    if (!loc || !zona) return undefined
    const { w, h } = loc
    const S = 30
    const intre = (v: number, a: number, b: number) => Math.max(a, Math.min(v, b))
    if (loc.loc === 'jos' || loc.loc === 'sus') {
      const x = intre(zona.left + zona.width / 2, loc.left + 24, loc.left + w - 24) - S / 2
      return { left: x, top: loc.loc === 'jos' ? loc.top - SPATIU + (SPATIU - S) / 2 : loc.top + h + (SPATIU - S) / 2 }
    }
    const y = intre(zona.top + zona.height / 2, loc.top + 24, loc.top + h - 24) - S / 2
    return { top: y, left: loc.loc === 'dreapta' ? loc.left - SPATIU + (SPATIU - S) / 2 : loc.left + w + (SPATIU - S) / 2 }
  })()

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* prinde click-urile: cât ține tutorialul, aplicația de dedesubt nu se apasă din greșeală */}
      <div className={cn('absolute inset-0', centrat && 'bg-[rgba(3,7,18,.72)]')} />

      {pas && zona && (
        <button
          type="button"
          aria-label="Mai departe"
          onClick={inainte}
          className="tur-lumina absolute cursor-pointer rounded-[12px]"
          style={{ top: zona.top, left: zona.left, width: zona.width, height: zona.height }}
        />
      )}

      {Sageata && sageataStil && (
        <span className={cn('pointer-events-none absolute text-accent-tx', `tur-sageata-${loc!.loc}`)} style={sageataStil} aria-hidden="true">
          <Sageata className="size-[30px]" strokeWidth={2.6} />
        </span>
      )}

      <div
        ref={cutie}
        key={String(faza)}
        aria-live="polite"
        className={cn(
          'tur-cutie absolute w-[min(400px,calc(100vw-24px))] [@media(max-height:720px)_and_(min-width:900px)]:w-[480px] rounded-[16px] border border-border-strong bg-card p-5 shadow-[0_18px_50px_rgba(0,0,0,.45)]',
          centrat && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={centrat ? undefined : loc ? { top: loc.top, left: loc.left } : { top: 0, left: 0, visibility: 'hidden' }}
      >
        {faza === 'intrebare' && (
          <>
            <span className="tur-icon mb-3.5 flex size-12 items-center justify-center rounded-[14px] bg-primary/15 text-accent-tx">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-foreground">Bine ai venit! Vrei un tutorial?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-tx-2">
              Îți arăt pas cu pas, pe câteva dosare de exemplu, cum adaugi un dosar, cum citești un card, ce face fiecare buton și la ce te ajută fiecare unealtă. Durează 4–5 minute și poți sări peste capitole.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={BTN_SECUNDAR} onClick={inchide}>
                Nu acum
              </button>
              <button ref={primar} type="button" className={BTN_PRIMAR} onClick={porneste}>
                Da, arată-mi
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3.5 flex items-center gap-1.5 text-[12px] text-tx-3">
              Îl poți porni oricând din butonul <GraduationCap className="size-3.5" aria-label="Tutorial" /> de lângă cont.
            </p>
          </>
        )}

        {pas && typeof faza === 'number' && (
          <>
            <div className="flex items-center gap-3">
              <span className="tur-icon flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/15 text-accent-tx">
                <pas.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-tx-3">
                  <span className="text-accent-tx">{pas.capitol}</span> · {faza + 1} din {PASI.length}
                </p>
                <h2 className="text-[16.5px] font-extrabold tracking-[-.01em] text-foreground">{pas.titlu}</h2>
              </div>
            </div>
            <div className="mt-3 text-[13.5px] leading-relaxed text-tx-2 [&_b]:font-bold [&_b]:text-foreground">{pas.text(numeTinta, telefon)}</div>
            {pas.detalii && (
              <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-snug text-tx-2 [&_b]:font-bold [&_b]:text-foreground">
                {pas.detalii.map((d, k) => (
                  <li key={k} className="flex gap-2">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent-tx/70" aria-hidden="true" />
                    <span className="min-w-0">{d}</span>
                  </li>
                ))}
              </ul>
            )}
            {pas.exemplu && (
              <p className="mt-2.5 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] leading-snug text-tx-2 [&_b]:font-bold [&_b]:text-foreground">
                <span className="mr-1.5 font-bold text-accent-tx">Exemplu</span>
                {pas.exemplu}
              </p>
            )}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((faza + 1) / PASI.length) * 100}%` }} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" className={BTN_TEXT} onClick={inchide}>
                Închide
              </button>
              {capitolUrmator > 0 && (
                <button type="button" className={BTN_TEXT} onClick={() => setFaza(capitolUrmator)} title={'Sari la „' + PASI[capitolUrmator].capitol + '”'}>
                  Sari capitolul
                </button>
              )}
              <span className="flex-1" />
              {faza > 0 && (
                <button type="button" className={BTN_SECUNDAR} onClick={inapoi}>
                  Înapoi
                </button>
              )}
              <button ref={primar} type="button" className={BTN_PRIMAR} onClick={inainte}>
                {faza + 1 < PASI.length ? 'Înainte' : 'Gata'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {faza === 'final' && (
          <>
            <span className="tur-icon mb-3.5 flex size-12 items-center justify-center rounded-[14px] bg-st-green/15 text-st-green-tx">
              <CircleCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-foreground">Asta e tot</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-tx-2">
              Cel mai simplu e să încerci: adaugă un dosar și urmărește-l de la predare până la finalizare.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={BTN_SECUNDAR} onClick={inchide}>
                Închide
              </button>
              <button
                ref={primar}
                type="button"
                className={BTN_PRIMAR}
                onClick={() => {
                  inchide()
                  onNou()
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Adaugă un dosar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
