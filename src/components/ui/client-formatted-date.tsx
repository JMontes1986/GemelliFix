'use client';

import { useState, useEffect } from 'react';

interface ClientFormattedDateProps {
  date: string | Date;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
}

export function ClientFormattedDate({ date, locale = 'es-CO', options }: ClientFormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // La fecha se formatea solo en el cliente para evitar errores de hidratación.
    setFormattedDate(new Date(date).toLocaleString(locale, options));
  }, [date, locale, options]);

  // Se renderiza un placeholder o nada mientras el componente no se haya montado en el cliente.
  if (!formattedDate) {
    return null;
  }

  return <>{formattedDate}</>;
}
