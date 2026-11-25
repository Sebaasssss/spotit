const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
const fecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** "hace 5 minutos", "ayer", "hace 2 semanas"; más de un mes: fecha completa. */
export function haceCuanto(iso: string, ahora = new Date()): string {
  const segundos = (new Date(iso).getTime() - ahora.getTime()) / 1000
  if (Math.abs(segundos) < 60) return 'hace un momento'
  const minutos = segundos / 60
  if (Math.abs(minutos) < 60) return rtf.format(Math.round(minutos), 'minute')
  const horas = minutos / 60
  if (Math.abs(horas) < 24) return rtf.format(Math.round(horas), 'hour')
  const dias = horas / 24
  if (Math.abs(dias) < 7) return rtf.format(Math.round(dias), 'day')
  const semanas = dias / 7
  if (Math.abs(semanas) < 5) return rtf.format(Math.round(semanas), 'week')
  return fecha.format(new Date(iso))
}

export function fechaCompleta(iso: string): string {
  return fechaHora.format(new Date(iso))
}
