import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center lg:bottom-8">
        {msg && <div className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-paper shadow-hover">{msg}</div>}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
