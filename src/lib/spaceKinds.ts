import type { Repeat } from './repeat'

/*
 * Bereich-Vorlagen: Jede Art bringt die passenden Reiter und (auf Wunsch) Startinhalte mit.
 * Bereiche ohne Art („frei“) zeigen wie bisher Aufgaben, Einkauf, Essen und Mitglieder.
 */

export type SpaceKind = 'haushalt' | 'reise' | 'budget' | 'event' | 'projekt' | 'haustier' | 'familie' | 'ideen' | 'frei'
export type SpaceTab = 'uebersicht' | 'aufgaben' | 'einkauf' | 'listen' | 'essen' | 'kosten' | 'budget' | 'mitglieder'

export interface StarterList {
  title: string
  /** Einfache Liste (Packliste, Gästeliste …) ohne Laden-Abteilungen */
  plain?: boolean
  items: string[]
}

export interface StarterTask {
  title: string
  repeat?: Repeat
}

export interface KindInfo {
  id: SpaceKind
  label: string
  emoji: string
  /** Kurz, für die Auswahl-Karte */
  desc: string
  /** Vorschlag für den Namen */
  placeholder: string
  tabs: SpaceTab[]
  /** Beschriftung des Reiters „listen“ */
  listsLabel?: string
  /** Eigene Beschriftungen einzelner Reiter */
  tabLabels?: Partial<Record<SpaceTab, string>>
  /** Bereich mit Stichtag (Countdown im Kopf): Beschriftung, z. B. „Abreise“ */
  dateLabel?: string
  /** Zufallsauswahl „Was machen wir?“ in den Listen */
  random?: boolean
  lists: StarterList[]
  tasks: StarterTask[]
}

export const SPACE_KINDS: KindInfo[] = [
  {
    id: 'haushalt',
    label: 'Haushalt',
    emoji: '🏠',
    desc: 'Putzplan im Wechsel, Einkauf, Essensplan',
    placeholder: 'Haushalt',
    tabs: ['aufgaben', 'einkauf', 'essen', 'mitglieder'],
    lists: [{ title: 'Einkauf', items: [] }],
    tasks: [
      { title: 'Staubsaugen', repeat: 'weekly' },
      { title: 'Bad putzen', repeat: 'weekly' },
      { title: 'Müll rausbringen', repeat: 'weekly' },
      { title: 'Bettwäsche wechseln', repeat: 'biweekly' },
      { title: 'Pflanzen gießen', repeat: 'weekly' },
    ],
  },
  {
    id: 'reise',
    label: 'Reise',
    emoji: '✈️',
    desc: 'Packliste, Countdown, Kosten teilen',
    placeholder: 'Urlaub 2027',
    tabs: ['aufgaben', 'listen', 'kosten', 'mitglieder'],
    listsLabel: '🧳 Packliste',
    dateLabel: 'Abreise',
    lists: [
      {
        title: 'Packliste',
        plain: true,
        items: ['Reisepass / Ausweis', 'Ladekabel', 'Adapter', 'Kopfhörer', 'Zahnbürste', 'Medikamente', 'Sonnencreme', 'Badesachen', 'Sonnenbrille'],
      },
    ],
    tasks: [
      { title: 'Unterkunft buchen' },
      { title: 'Reiseversicherung prüfen' },
      { title: 'Ausweise auf Gültigkeit prüfen' },
      { title: 'Online einchecken' },
      { title: 'Katzen-/Pflanzensitter organisieren' },
    ],
  },
  {
    id: 'budget',
    label: 'Budget',
    emoji: '💶',
    desc: 'Gemeinsame Kosten, wer schuldet wem, Sparziele',
    placeholder: 'Budget',
    tabs: ['uebersicht', 'kosten', 'budget', 'aufgaben', 'mitglieder'],
    tabLabels: { kosten: '🧾 Ausgaben', budget: '📅 Fixkosten & Sparen' },
    lists: [],
    tasks: [
      { title: 'Kontoauszüge durchsehen', repeat: 'monthly' },
      { title: 'Abos und Verträge prüfen', repeat: 'monthly' },
      { title: 'Ausgaben ausgleichen', repeat: 'monthly' },
    ],
  },
  {
    id: 'event',
    label: 'Feier / Event',
    emoji: '🎉',
    desc: 'Gäste, Mitbringliste, Countdown',
    placeholder: 'Geburtstag',
    tabs: ['aufgaben', 'listen', 'kosten', 'mitglieder'],
    listsLabel: '📋 Listen',
    dateLabel: 'Termin',
    lists: [
      { title: 'Gäste', plain: true, items: [] },
      { title: 'Mitbringen', plain: true, items: ['Getränke', 'Kuchen', 'Salat', 'Deko'] },
    ],
    tasks: [{ title: 'Einladungen verschicken' }, { title: 'Ort festlegen' }, { title: 'Essen planen' }, { title: 'Deko besorgen' }],
  },
  {
    id: 'projekt',
    label: 'Projekt',
    emoji: '🔧',
    desc: 'Renovierung, Umzug: Material und Kosten',
    placeholder: 'Wohnzimmer streichen',
    tabs: ['aufgaben', 'listen', 'kosten', 'mitglieder'],
    listsLabel: '🧰 Material',
    dateLabel: 'Fertig bis',
    lists: [{ title: 'Material', plain: true, items: [] }],
    tasks: [{ title: 'Plan und Maße festlegen' }, { title: 'Angebote einholen' }, { title: 'Material besorgen' }],
  },
  {
    id: 'haustier',
    label: 'Haustier',
    emoji: '🐱',
    desc: 'Füttern im Wechsel, Tierarzt, Futter',
    placeholder: 'Unsere Katzen',
    tabs: ['aufgaben', 'einkauf', 'mitglieder'],
    lists: [{ title: 'Tierbedarf', items: ['Katzenfutter', 'Katzenstreu', 'Leckerlis'] }],
    tasks: [
      { title: 'Füttern', repeat: 'daily' },
      { title: 'Katzenklo sauber machen', repeat: 'daily' },
      { title: 'Wassernapf frisch füllen', repeat: 'daily' },
      { title: 'Krallen und Fell pflegen', repeat: 'weekly' },
      { title: 'Tierarzt-Check und Impfung', repeat: 'yearly' },
    ],
  },
  {
    id: 'familie',
    label: 'Familie',
    emoji: '👨‍👩‍👧',
    desc: 'Termine, Einkauf, Essen, Geschenkideen',
    placeholder: 'Familie',
    tabs: ['aufgaben', 'einkauf', 'essen', 'listen', 'mitglieder'],
    listsLabel: '🎁 Ideen',
    lists: [
      { title: 'Einkauf', items: [] },
      { title: 'Geschenkideen', plain: true, items: [] },
    ],
    tasks: [{ title: 'Termine der Woche abstimmen', repeat: 'weekly' }],
  },
  {
    id: 'ideen',
    label: 'Ideen & Wünsche',
    emoji: '💡',
    desc: 'Restaurants, Ausflüge, Filme – mit Zufallswahl',
    placeholder: 'Unsere Ideen',
    tabs: ['listen', 'aufgaben', 'mitglieder'],
    listsLabel: '💡 Ideen',
    random: true,
    lists: [
      { title: 'Restaurants', plain: true, items: [] },
      { title: 'Ausflüge', plain: true, items: [] },
      { title: 'Filme & Serien', plain: true, items: [] },
    ],
    tasks: [],
  },
  {
    id: 'frei',
    label: 'Frei',
    emoji: '👥',
    desc: 'Alles wie bisher, ohne Vorlage',
    placeholder: 'Neuer Bereich',
    tabs: ['aufgaben', 'einkauf', 'essen', 'mitglieder'],
    lists: [{ title: 'Einkauf', items: [] }],
    tasks: [],
  },
]

const BY_ID = new Map(SPACE_KINDS.map((k) => [k.id, k]))

/** Art eines Bereichs (ohne Angabe: „frei“ – wie Bereiche vor den Vorlagen) */
export function kindInfo(kind?: string): KindInfo {
  return BY_ID.get(kind as SpaceKind) ?? BY_ID.get('frei')!
}

export const TAB_LABELS: Record<SpaceTab, string> = {
  uebersicht: '📊 Übersicht',
  aufgaben: '✅ Aufgaben',
  einkauf: '🛒 Einkauf',
  listen: '📋 Listen',
  essen: '🍽️ Essen',
  kosten: '💶 Kosten',
  budget: '📊 Fixkosten & Sparen',
  mitglieder: '👥 Mitglieder',
}

export function tabLabel(kind: KindInfo, tab: SpaceTab): string {
  if (kind.tabLabels?.[tab]) return kind.tabLabels[tab]!
  return tab === 'listen' && kind.listsLabel ? kind.listsLabel : TAB_LABELS[tab]
}

/** Text für den Countdown: „noch 12 Tage“, „morgen“, „heute!“, „vor 3 Tagen“ */
export function countdownText(date: string, today: string): string {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)
  if (days === 0) return 'heute!'
  if (days === 1) return 'morgen'
  if (days > 1) return `noch ${days} Tage`
  if (days === -1) return 'gestern'
  return `vor ${-days} Tagen`
}
