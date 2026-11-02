import { useEffect, useState } from 'react';

/**
 * Rotas por âncora simples (#painel, #fornecedores, #fornecedor-sup-bella …).
 * Só letras, números e hífens: funciona em qualquer hospedagem estática.
 */
export const SECTIONS = ['painel', 'pagamentos', 'tarefas', 'fornecedores', 'orcamento', 'ajustes'] as const;
export type Section = (typeof SECTIONS)[number];

export type Route =
  | { name: Section }
  | { name: 'fornecedor'; id: string }
  | { name: 'categoria'; id: string };

/** id interno "sup_bella" ↔ âncora "sup-bella" */
const encodeId = (id: string) => id.replace('_', '-');
const decodeId = (s: string) => s.replace('-', '_');

export const href = {
  section: (s: Section) => `#${s}`,
  supplier: (id: string) => `#fornecedor-${encodeId(id)}`,
  category: (id: string) => `#categoria-${encodeId(id)}`,
};

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h.startsWith('fornecedor-')) return { name: 'fornecedor', id: decodeId(h.slice('fornecedor-'.length)) };
  if (h.startsWith('categoria-')) return { name: 'categoria', id: decodeId(h.slice('categoria-'.length)) };
  return { name: (SECTIONS as readonly string[]).includes(h) ? (h as Section) : 'painel' };
}

/** Seção do menu que fica ativa para a rota */
export function sectionOf(route: Route): Section {
  if (route.name === 'fornecedor') return 'fornecedores';
  if (route.name === 'categoria') return 'orcamento';
  return route.name;
}

export function navigate(to: string) {
  window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
