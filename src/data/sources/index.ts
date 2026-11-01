import type { DataSource } from '../DataSource';
import { HttpDataSource } from './HttpDataSource';
import { MockDataSource } from './MockDataSource';

/**
 * Escolha da persistência em um só lugar.
 * - No Netlify (VITE_DATA_SOURCE=http, definido no netlify.toml): dados no GitHub.
 * - Em qualquer outro lugar (prévia, desenvolvimento): dados de exemplo no navegador.
 */
export const dataSource: DataSource = import.meta.env.VITE_DATA_SOURCE === 'http' ? new HttpDataSource() : new MockDataSource();

/** Repositório do GitHub (usuario/nome), para o link do histórico em Ajustes */
export const githubRepo: string = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : '';
