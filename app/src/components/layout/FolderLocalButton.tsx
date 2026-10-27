import { Laptop, RefreshCw, Unlink, FolderOpen } from 'lucide-react'
import { alegeFolder, deconecteaza, permiteCitirea, rescaneaza, useFolderLocal } from '@/lib/folder-local'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const BTN =
  'relative flex size-[34px] items-center justify-center rounded-[10px] border border-border bg-border/[.28] text-tx-2 transition-colors hover:bg-border/60 hover:text-white'

function Punct({ culoare }: { culoare: string }) {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full"
      style={{ background: culoare, boxShadow: '0 0 0 2px var(--background)' }}
    />
  )
}

// Legatura cu folderul „RCA" de pe laptop (doar citire, lib/folder-local.ts). Apare doar in
// browserele care permit (Chrome/Edge pe calculator).
export function FolderLocalButton() {
  const f = useFolderLocal()
  if (!f.suportat) return null

  if (!f.nume) {
    return (
      <button type="button" className={BTN} onClick={() => void alegeFolder()} title="Leagă folderul cu dosare de pe laptop (doar citire)" aria-label="Leagă folderul de pe laptop">
        <Laptop className="size-4" aria-hidden="true" />
      </button>
    )
  }

  if (f.permis !== 'granted') {
    return (
      <button
        type="button"
        className={BTN}
        onClick={() => void permiteCitirea()}
        title={`Dă voie aplicației să citească folderul „${f.nume}”`}
        aria-label="Permite citirea folderului de pe laptop"
      >
        <Laptop className="size-4" aria-hidden="true" />
        <Punct culoare="var(--st-amber)" />
      </button>
    )
  }

  const ora = f.scanatLa ? new Date(f.scanatLa).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={BTN} title={`Folder legat: „${f.nume}” · ${f.nrDosare} dosare`} aria-label="Folderul de pe laptop">
          <Laptop className="size-4" aria-hidden="true" />
          <Punct culoare="var(--st-green)" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="truncate text-[12.5px] font-bold text-foreground">„{f.nume}” pe laptop</p>
          <p className="text-[11px] text-muted-foreground">
            {f.seScaneaza ? 'Se citește…' : `${f.nrDosare} foldere de dosar · citit la ${ora}`}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Doar citire: aplicația vede numele fișierelor, nu încarcă și nu modifică nimic.</p>
          {f.eroare && <p className="mt-1 text-[11px] text-destructive">{f.eroare}</p>}
        </div>
        <DropdownMenuItem onClick={() => void rescaneaza()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Recitește acum
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void alegeFolder()}>
          <FolderOpen className="size-4" aria-hidden="true" /> Alege alt folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void deconecteaza()}>
          <Unlink className="size-4" aria-hidden="true" /> Deconectează
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
