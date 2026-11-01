import type { PaymentMethod, PipelineStatus } from '../domain/types';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'PIX',
  transfer: 'Transferência',
  credit: 'Cartão de crédito',
  debit: 'Cartão de débito',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  other: 'Outro',
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

/** Status que a pessoa escolhe à mão (Contratado é automático) */
export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  researching: 'Pesquisando',
  quoted: 'Orçamento recebido',
  negotiating: 'Negociando',
  cancelled: 'Cancelado',
};
