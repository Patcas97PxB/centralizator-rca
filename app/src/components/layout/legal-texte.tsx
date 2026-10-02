import type { ReactNode } from 'react'
import { ESTE_DEMO } from '@/lib/demo'

// Textele din josul paginii (GDPR, termeni, cookie-uri). Model standard, adaptat aplicatiei —
// de verificat de un jurist inainte de a fi considerat document oficial.
export const TITULAR = 'Pătcaș Bogdan'
export const DATA_ACTUALIZARE = '2 octombrie 2026'

export type DocLegal = 'gdpr' | 'termeni' | 'cookies'

const H = ({ children }: { children: ReactNode }) => <h3 className="mt-4 text-[13.5px] font-bold text-foreground">{children}</h3>
const P = ({ children, className = 'mt-1.5' }: { children: ReactNode; className?: string }) => <p className={className}>{children}</p>
const L = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-1.5 list-disc space-y-1 pl-5">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
)

const NotaDemo = () =>
  ESTE_DEMO ? (
    <P>
      <strong>Varianta de test:</strong> nu se trimite nimic către server. Datele pe care le modifici rămân doar în browserul tău
      (IndexedDB) și se șterg cu „Resetează datele” sau din setările browserului.
    </P>
  ) : null

export const DOCUMENTE_LEGALE: Record<DocLegal, { titlu: string; continut: ReactNode }> = {
  gdpr: {
    titlu: 'Politica de confidențialitate (GDPR)',
    continut: (
      <>
        <P>
          Această politică explică cum sunt prelucrate datele cu caracter personal în aplicația Centralizator RCA, conform
          Regulamentului (UE) 2016/679 (GDPR) și Legii nr. 190/2018.
        </P>
        <H>1. Cine prelucrează datele</H>
        <P>
          Operatorul datelor este {TITULAR}, administratorul aplicației. Aplicația este un instrument intern, cu acces pe bază de
          parolă, folosit pentru gestionarea dosarelor de daună RCA în care se oferă mașini de înlocuire.
        </P>
        <H>2. Ce date se prelucrează</H>
        <L
          items={[
            'date de identificare ale dosarului: număr dosar de daună, număr rezervare/contract, asigurator;',
            'date despre vehicule: număr de înmatriculare (păgubit și înlocuire), marcă/model, clasă;',
            'date de contact: telefonul clientului și al service-ului;',
            'documente încărcate: constatare amiabilă, notă de constatare, deviz, contracte, procese-verbale, acte ale păgubitului și vinovatului (pot conține CI, permis, certificat de înmatriculare, poliță RCA);',
            'date contractuale: perioade, zile, valori, tarife.',
          ]}
        />
        <H>3. Scopul și temeiul legal</H>
        <L
          items={[
            'gestionarea și urmărirea dosarelor de daună și a contractelor de închiriere a mașinilor de înlocuire — executarea contractului (art. 6 alin. (1) lit. b GDPR);',
            'recuperarea costurilor de la asiguratori și evidența financiară — obligații legale și interes legitim (art. 6 alin. (1) lit. c și f);',
            'păstrarea documentelor justificative — obligații legale (contabile, fiscale, de asigurări).',
          ]}
        />
        <H>4. Unde sunt stocate și cine are acces</H>
        <P>
          Datele sunt stocate la furnizori specializați de infrastructură cloud (bază de date, spațiu de fișiere și găzduire web),
          care acționează ca persoane împuternicite și aplică măsuri de securitate adecvate. Accesul este permis doar utilizatorilor autorizați, pe bază de parolă. Datele pot fi transmise,
          strict în scopul dosarului, asiguratorilor, service-urilor și autorităților, când legea o cere. Datele nu se vând și nu se
          folosesc în scop de marketing.
        </P>
        <P>
          Citirea automată a documentelor (PDF, poze, OCR) și modificarea PDF-urilor se fac <strong>local, în browser</strong>, fără a
          trimite fișierele către servicii externe de procesare.
        </P>
        <NotaDemo />
        <H>5. Cât timp se păstrează</H>
        <P>
          Datele se păstrează pe durata gestionării dosarului și ulterior pe perioada impusă de obligațiile legale de arhivare (inclusiv
          cele financiar-contabile), după care se șterg.
        </P>
        <H>6. Drepturile persoanelor vizate</H>
        <L
          items={[
            'dreptul de acces la date;',
            'dreptul la rectificare;',
            'dreptul la ștergere („dreptul de a fi uitat”), în limitele legii;',
            'dreptul la restricționarea prelucrării;',
            'dreptul la portabilitatea datelor;',
            'dreptul de opoziție;',
            'dreptul de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro.',
          ]}
        />
        <P>Pentru exercitarea acestor drepturi, persoanele vizate se pot adresa administratorului aplicației ({TITULAR}).</P>
        <H>7. Securitate</H>
        <P>
          Se aplică măsuri tehnice și organizatorice rezonabile: acces cu parolă, conexiune criptată (HTTPS), acces limitat la persoanele
          autorizate și copii de siguranță.
        </P>
        <P className="mt-4 text-[11.5px] opacity-70">Ultima actualizare: {DATA_ACTUALIZARE}.</P>
      </>
    ),
  },
  termeni: {
    titlu: 'Termeni și condiții de utilizare',
    continut: (
      <>
        <H>1. Despre aplicație</H>
        <P>
          Centralizator RCA este o aplicație internă pentru evidența dosarelor RCA cu mașini de înlocuire. Accesul este permis doar
          persoanelor autorizate de {TITULAR}, pe bază de parolă.
        </P>
        <H>2. Utilizare permisă</H>
        <L
          items={[
            'folosirea aplicației doar în scopul gestionării dosarelor de daună;',
            'păstrarea confidențialității parolei și a datelor din aplicație;',
            'interzisă copierea, extragerea sau transmiterea datelor către persoane neautorizate;',
            'interzisă încercarea de a ocoli autentificarea sau de a perturba funcționarea aplicației.',
          ]}
        />
        <H>3. Calcule și citiri automate</H>
        <P>
          Zilele de reparație, termenele, tarifele și datele citite automat din documente (deviz, contract, poze) sunt orientative și se
          verifică de utilizator înainte de a fi folosite. Răspunderea pentru datele introduse și pentru deciziile luate rămâne a
          utilizatorului.
        </P>
        <H>4. Disponibilitate</H>
        <P>
          Aplicația este oferită „ca atare”. Se depun eforturi rezonabile pentru funcționare continuă, dar pot exista întreruperi sau
          erori. Se recomandă exportul periodic al datelor (butonul de backup).
        </P>
        {ESTE_DEMO && (
          <>
            <H>5. Varianta de test</H>
            <P>
              Varianta de test este destinată exclusiv evaluării. Datele prezentate sunt confidențiale și nu pot fi copiate, salvate sau
              transmise mai departe.
            </P>
          </>
        )}
        <H>{ESTE_DEMO ? '6' : '5'}. Proprietate intelectuală</H>
        <P>
          Aplicația, codul, designul și conținutul sunt proprietatea lui {TITULAR}. Toate drepturile rezervate. Mărcile și denumirile
          asiguratorilor și ale producătorilor auto aparțin titularilor lor și sunt folosite doar pentru identificare.
        </P>
        <P className="mt-4 text-[11.5px] opacity-70">Ultima actualizare: {DATA_ACTUALIZARE}.</P>
      </>
    ),
  },
  cookies: {
    titlu: 'Cookie-uri și stocare locală',
    continut: (
      <>
        <P>Aplicația nu folosește cookie-uri de reclamă sau de urmărire și nu include servicii de analiză (analytics).</P>
        <H>Ce se salvează în browser</H>
        <L
          items={[
            <>
              <strong>sesiunea de autentificare</strong> — ca să rămâi logat (stocare locală, strict necesară);
            </>,
            <>
              <strong>starea meniului lateral</strong> — cookie „sidebar_state” (deschis/închis), strict funcțional;
            </>,
            <>
              <strong>preferința de animații</strong> — stocare locală, strict funcțională;
            </>,
            ...(ESTE_DEMO
              ? [
                  <>
                    <strong>datele variantei de test</strong> — în IndexedDB, doar pe acest dispozitiv;
                  </>,
                ]
              : []),
          ]}
        />
        <P>
          Pentru citirea PDF-urilor, a pozelor și pentru export, aplicația încarcă biblioteci de pe rețele publice de distribuție,
          care pot vedea adresa IP, ca orice site vizitat. Documentele tale nu sunt trimise
          acestor servicii.
        </P>
        <P>Le poți șterge oricând din setările browserului; după ștergere va trebui să te autentifici din nou.</P>
        <P className="mt-4 text-[11.5px] opacity-70">Ultima actualizare: {DATA_ACTUALIZARE}.</P>
      </>
    ),
  },
}
