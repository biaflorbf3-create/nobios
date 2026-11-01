import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useFinance } from '../../data/hooks/useSnapshot';
import { RegisterPaymentSheet } from './RegisterPaymentSheet';

type Open = (installmentId?: string | null) => void;
const Ctx = createContext<Open>(() => {});

/** Um único painel de "Registrar pagamento" para o app inteiro */
export function PaymentProvider({ children }: { children: ReactNode }) {
  const data = useFinance();
  const [state, setState] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const open = useCallback<Open>((id = null) => setState({ open: true, id }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {data && <RegisterPaymentSheet open={state.open} onClose={close} installmentId={state.id} snapshot={data.snapshot} finance={data.finance} />}
    </Ctx.Provider>
  );
}

export const useRegisterPayment = () => useContext(Ctx);
