/** Iconos dibujados a mano en una sola familia: trazo de 2 px, puntas redondeadas, caja de 24. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </Icon>
)

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)

export const DotIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </Icon>
)

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4" />
    <path d="M6.6 6.7A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.9-1.3" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </Icon>
)

export const CloudOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 7.3A5.5 5.5 0 0 1 17.6 10 4 4 0 0 1 20 16.9" />
    <path d="M16 18.5H7a4.5 4.5 0 0 1-1.6-8.7" />
    <path d="M3 3l18 18" />
  </Icon>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Icon>
)

export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
    <path d="M10 16.5 5.5 12 10 7.5" />
    <path d="M5.5 12H15" />
  </Icon>
)

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// --- Acciones ---

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
)

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17.5 4.5-4.5 3.5 3.5 2.5-2.5 5.5 5" />
  </Icon>
)

export const LocateIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </Icon>
)

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
  </Icon>
)

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <circle cx="4.5" cy="6.5" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="17.5" r="1" fill="currentColor" />
  </Icon>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
)

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.5 4.5v4h-4" />
  </Icon>
)

// --- Estados del reporte ---

export const InboxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 13.5 6 5.5h12l2.5 8v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
    <path d="M3.5 13.5h5l1 2h5l1-2h5" />
  </Icon>
)

export const WrenchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.6-8.6a4 4 0 0 1-2.1-2.1Z" />
  </Icon>
)

// --- Categorías (clave = campo `icono` de la API) ---

const CategoriaIcons = {
  bache: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4 20 8 4M20 20 16 4M12 4v2.5M12 10v2.5" />
      <ellipse cx="12" cy="17" rx="3.5" ry="1.8" />
    </Icon>
  ),
  alumbrado: (p: IconProps) => (
    <Icon {...p}>
      <path d="M8 21h6M11 21V7a3 3 0 0 1 3-3h1.5" />
      <path d="M14 7h5l-1.5 3h-2Z" />
      <path d="M16.5 12.5v1.5M19.5 12l1 1M13.5 12l-1 1" />
    </Icon>
  ),
  agua: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </Icon>
  ),
  basura: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </Icon>
  ),
  'areas-verdes': (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 21v-6" />
      <path d="M12 3.5c3.5 0 6 2.8 6 6.2 0 3-2.5 5.3-6 5.3s-6-2.3-6-5.3c0-3.4 2.5-6.2 6-6.2Z" />
      <path d="M12 15l-2.5-2.5M12 13l2.5-2.5" />
    </Icon>
  ),
  banqueta: (p: IconProps) => (
    <Icon {...p}>
      <path d="M3 19.5h18" />
      <path d="M3 15.5h7v4M10 15.5l3-3h8" />
      <circle cx="16" cy="5" r="1.5" />
      <path d="M16 7.5v3l-2 2M16 10.5l2 2" />
    </Icon>
  ),
  senal: (p: IconProps) => (
    <Icon {...p}>
      <path d="M12 21V3.5" />
      <path d="M12 5h6.5l2 2.5-2 2.5H12" />
      <path d="M12 12H5.5l-2 2.5 2 2.5H12" />
    </Icon>
  ),
  edificio: (p: IconProps) => (
    <Icon {...p}>
      <path d="M4.5 20.5h15M6 20.5V5.5l6-2 6 2v15" />
      <path d="M9.5 9h1M13.5 9h1M9.5 12.5h1M13.5 12.5h1M10.5 20.5v-4h3v4" />
    </Icon>
  ),
  otro: (p: IconProps) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </Icon>
  ),
}

export function CategoriaIcon({ icono, ...p }: IconProps & { icono: string }) {
  const Componente =
    CategoriaIcons[icono as keyof typeof CategoriaIcons] ?? CategoriaIcons.otro
  return <Componente {...p} />
}
