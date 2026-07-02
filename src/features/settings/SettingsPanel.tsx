import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

import styles from './SettingsPanel.module.css'
import { settingsStore } from './SettingsStore'
import { BUILTIN_THEMES, type ThemeDefinition } from './themes'

import type { AppSettings } from './types'

type Section = 'appearance' | 'font' | 'terminal' | 'startup' | 'window'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'font', label: 'Font' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'startup', label: 'Startup' },
  { id: 'window', label: 'Window' },
]

const SHELL_OPTIONS = [
  { value: 'powershell', label: 'PowerShell' },
  { value: 'cmd', label: 'Command Prompt' },
  { value: 'gitbash', label: 'Git Bash' },
  { value: 'wsl', label: 'WSL' },
] as const

const FONT_SUGGESTIONS = [
  'Cascadia Code',
  'Cascadia Mono',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'Hack',
  'Inconsolata',
  'Consolas',
  'Courier New',
]

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const [section, setSection] = useState<Section>('appearance')
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const update = (patch: Partial<AppSettings>) => settingsStore.update(patch)

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.panel} role="dialog" aria-label="Settings">
        <div className={styles.header}>
          <span className={styles.title}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <div className={styles.body}>
          <nav className={styles.nav}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`${styles.navItem} ${section === s.id ? styles.navItemActive : ''}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className={styles.content}>
            {section === 'appearance' && (
              <AppearanceSection settings={settings} update={update} />
            )}
            {section === 'font' && (
              <FontSection settings={settings} update={update} />
            )}
            {section === 'terminal' && (
              <TerminalSection settings={settings} update={update} />
            )}
            {section === 'startup' && (
              <StartupSection settings={settings} update={update} />
            )}
            {section === 'window' && (
              <WindowSection settings={settings} update={update} />
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={() => settingsStore.reset()}>
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared primitives

interface SectionProps {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMeta}>
        <span className={styles.rowLabel}>{label}</span>
        {hint && <span className={styles.rowHint}>{hint}</span>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
    </label>
  )
}

function SliderRow({
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div className={styles.sliderRow}>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className={styles.sliderValue}>{display}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appearance section

function ThemePreview({ theme }: { theme: ThemeDefinition }) {
  const { terminal: t, cssVars } = theme
  return (
    <div
      className={styles.themePreview}
      style={{ background: t.background, borderColor: cssVars['--color-border'] }}
    >
      <div style={{ color: t.foreground, fontFamily: 'monospace', fontSize: '9px', lineHeight: 1.6 }}>
        <div>
          <span style={{ color: t.green }}>user</span>
          <span style={{ color: t.brightBlack }}>@smux</span>
          {' '}
          <span style={{ color: t.blue }}>~/projects</span>
        </div>
        <div>
          <span style={{ color: t.cyan }}>❯</span>
          {' '}
          <span style={{ color: t.foreground }}>git status</span>
        </div>
        <div style={{ color: t.brightBlack }}>On branch main</div>
      </div>
    </div>
  )
}

function AppearanceSection({ settings, update }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Appearance</h2>

      <Row label="Theme">
        <div className={styles.themeCards}>
          {BUILTIN_THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`${styles.themeCard} ${settings.theme === theme.id ? styles.themeCardActive : ''}`}
              onClick={() => update({ theme: theme.id })}
            >
              <ThemePreview theme={theme} />
              <span className={styles.themeCardLabel}>{theme.name}</span>
            </button>
          ))}
        </div>
      </Row>

      <Row label="Accent Color">
        <div className={styles.colorRow}>
          <input
            type="color"
            className={styles.colorInput}
            value={settings.accentColor}
            onChange={(e) => update({ accentColor: e.target.value })}
          />
          <span className={styles.colorHex}>{settings.accentColor.toUpperCase()}</span>
        </div>
      </Row>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Font section

function FontSection({ settings, update }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Font</h2>

      <Row label="Font Family" hint="Applied to the terminal">
        <>
          <input
            type="text"
            className={styles.textInput}
            value={settings.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            list="font-suggestions"
            spellCheck={false}
          />
          <datalist id="font-suggestions">
            {FONT_SUGGESTIONS.map((f) => <option key={f} value={f} />)}
          </datalist>
        </>
      </Row>

      <Row label="Font Size">
        <SliderRow
          value={settings.fontSize}
          min={8}
          max={28}
          step={1}
          display={`${settings.fontSize}px`}
          onChange={(v) => update({ fontSize: v })}
        />
      </Row>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Terminal section

function TerminalSection({ settings, update }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Terminal</h2>

      <Row label="Opacity" hint="Background transparency">
        <SliderRow
          value={settings.terminalOpacity}
          min={0.1}
          max={1.0}
          step={0.05}
          display={`${Math.round(settings.terminalOpacity * 100)}%`}
          onChange={(v) => update({ terminalOpacity: v })}
        />
      </Row>

      <Row label="Default Shell">
        <select
          className={styles.select}
          value={settings.defaultShell}
          onChange={(e) => update({ defaultShell: e.target.value as AppSettings['defaultShell'] })}
        >
          {SHELL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Row>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Startup section

function StartupSection({ settings, update }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Startup</h2>

      <Row label="Restore Session" hint="Reopen tabs and splits from last session">
        <Toggle
          checked={settings.restoreSession}
          onChange={(v) => update({ restoreSession: v })}
        />
      </Row>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Window section

function WindowSection({ settings, update }: SectionProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Window</h2>

      <Row label="Confirm on Close" hint="Ask before closing the window">
        <Toggle
          checked={settings.confirmOnClose}
          onChange={(v) => update({ confirmOnClose: v })}
        />
      </Row>

      <Row label="Start Maximized" hint="Applies on next launch">
        <Toggle
          checked={settings.startMaximized}
          onChange={(v) => update({ startMaximized: v })}
        />
      </Row>
    </div>
  )
}
