import type { ReactNode } from 'react'

interface IconProps {
  size?: number
}

function Icon({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  )
}

export function TerminalIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <polyline points="2,5 7,9 2,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  )
}

export function FolderIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M2 6.5h4.5l1.5 2H16v7H2V6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.5" y1="11.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  )
}

export function SettingsIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.5V3M9 15v1.5M1.5 9H3M15 9h1.5M3.7 3.7l1.05 1.05M13.25 13.25l1.05 1.05M3.7 14.3l1.05-1.05M13.25 4.75l1.05-1.05"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </Icon>
  )
}

export function PlusIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  )
}

export function ChevronRightIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <polyline points="6,3.5 12,9 6,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function ChevronDownIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <polyline points="3.5,6 9,12 14.5,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function PanelCloseIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <polyline points="12,3.5 6,9 12,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function CircleIcon({ size = 18 }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
    </Icon>
  )
}

export function NexusLogoIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 14V2l5 6-5 6z" fill="currentColor" />
      <path d="M14 2v12L9 8l5-6z" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
