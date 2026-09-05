import type { CSSProperties, ReactNode } from 'react'

export interface OrgMember { name: string; role?: string }
export interface OrgGroup { title: string; members: OrgMember[] }
export interface OrgUnit { title: string; roles?: { name: string }[] }

/**
 * The koperasi's structure as a chart rather than three columns of names.
 *
 * Drawn in HTML and CSS on purpose. The chart libraries that do this — d3-org-chart,
 * react-d3-tree — paint SVG in the browser after the page loads, which would put
 * the whole board and every unit outside what Google reads; react-organizational-chart
 * is lighter but drags in a CSS-in-JS runtime for styling this project already has
 * tokens for. The structure here is fixed and small, so the connectors are a few
 * absolutely positioned rules and the names stay in the markup as text.
 *
 * Below the small breakpoint the connectors are hidden and the tiers stack, because
 * four levels of boxes cannot be read side by side on a phone.
 */

/** The vertical line leaving the bottom of a box. */
function Stem({ tall = false }: { tall?: boolean }) {
  return <span aria-hidden="true" className={`mx-auto hidden w-px bg-line-strong sm:block ${tall ? 'h-10' : 'h-7'}`} />
}

function Tier({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="relative">
      {count > 1 ? (
        <span
          aria-hidden="true"
          className="absolute top-0 hidden h-px bg-line-strong sm:block"
          style={{ left: `${50 / count}%`, right: `${50 / count}%` }}
        />
      ) : null}
      <div
        className="mt-4 grid gap-4 [grid-template-columns:minmax(0,1fr)] sm:mt-0 sm:[grid-template-columns:var(--cols)]"
        style={{ '--cols': `repeat(${count}, minmax(0, 1fr))` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}

/** A child of the tier above: its own drop line, then the box. */
function Node({ children }: { children: ReactNode }) {
  return (
    <div className="relative sm:pt-7">
      <span aria-hidden="true" className="absolute left-1/2 top-0 hidden h-7 w-px bg-line-strong sm:block" />
      {children}
    </div>
  )
}

function Apex({ label }: { label: string }) {
  return (
    <p className="mx-auto w-fit rounded-[var(--radius-tile)] bg-ink-900 px-6 py-3 text-center text-[13px] font-bold uppercase tracking-[0.1em] text-white">
      {label}
    </p>
  )
}

function GroupCard({ group }: { group: OrgGroup }) {
  return (
    <div className="surface h-full overflow-hidden">
      <h3 className="border-b border-line bg-paper px-5 py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.09em] text-green-700">
        {group.title}
      </h3>
      <ul className="divide-y divide-line">
        {group.members.map((m, i) => (
          <li key={i} className="px-5 py-3 text-center">
            <p className="text-[14.5px] font-bold leading-snug text-ink-900">{m.name}</p>
            {m.role ? <p className="mt-0.5 text-[12px] text-ink-400">{m.role}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UnitCard({ unit }: { unit: OrgUnit }) {
  return (
    <div className="h-full">
      <p className="rounded-[var(--radius-tile)] bg-green-700 px-4 py-2.5 text-center text-[12.5px] font-bold uppercase tracking-[0.07em] text-white">
        {unit.title}
      </p>
      {unit.roles?.length ? (
        <ul className="mt-3 grid gap-2">
          {unit.roles.map((r, i) => (
            <li
              key={i}
              className="rounded-[var(--radius-tile)] border border-line bg-white px-3.5 py-2 text-center text-[12.5px] font-semibold text-ink-700"
            >
              {r.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function OrgChart({
  groups, apex, audit, operationsLead, units,
}: {
  groups: OrgGroup[]
  apex?: string
  audit?: string
  operationsLead?: string
  units?: OrgUnit[]
}) {
  const hasOperations = Boolean(operationsLead?.trim() || units?.length)

  return (
    <div className="mx-auto max-w-4xl">
      {apex?.trim() ? (
        <>
          <Apex label={apex} />
          <Stem />
        </>
      ) : null}

      {groups.length ? (
        <Tier count={groups.length}>
          {groups.map((g, i) => (
            <Node key={i}><GroupCard group={g} /></Node>
          ))}
        </Tier>
      ) : null}

      {hasOperations ? (
        <>
          {/* The spine continues from the board. The internal auditor hangs off
              it rather than under it: SPI answers to the pengurus and sits
              beside the line on the koperasi's own chart. */}
          <div className="relative mx-auto hidden h-14 w-px bg-line-strong sm:block">
            {audit?.trim() ? (
              <>
                <span aria-hidden="true" className="absolute left-0 top-1/2 h-px w-14 bg-line-strong" />
                <p className="absolute left-14 top-1/2 w-fit -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-tile)] border border-gold-400 bg-gold-50 px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-800">
                  {audit}
                </p>
              </>
            ) : null}
          </div>

          {audit?.trim() ? (
            <p className="mx-auto mt-4 w-fit rounded-[var(--radius-tile)] border border-gold-400 bg-gold-50 px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-800 sm:hidden">
              {audit}
            </p>
          ) : null}

          {operationsLead?.trim() ? (
            <>
              <p className="mx-auto mt-4 w-fit rounded-[var(--radius-tile)] bg-ink-800 px-6 py-2.5 text-center text-[12.5px] font-bold uppercase tracking-[0.08em] text-white sm:mt-0">
                {operationsLead}
              </p>
              {units?.length ? <Stem tall /> : null}
            </>
          ) : null}

          {units?.length ? (
            <Tier count={units.length}>
              {units.map((u, i) => (
                <Node key={i}><UnitCard unit={u} /></Node>
              ))}
            </Tier>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
