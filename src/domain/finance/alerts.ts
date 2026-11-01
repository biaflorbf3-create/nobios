import type { Cents } from '../types';

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  detail?: string;
  amount?: Cents;
  /** destino (âncora de tela) para resolver */
  href?: string;
}

export const ALERT_ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };

/** Alerta de "serviço não contratado" só aparece a menos de N dias do casamento */
export const UNCONTRACTED_ALERT_DAYS = 180;
