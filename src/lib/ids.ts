const PREFIX = {
  categories: 'cat',
  suppliers: 'sup',
  quotes: 'quo',
  contracts: 'con',
  installments: 'ins',
  payments: 'pay',
  people: 'per',
  users: 'usr',
  tasks: 'tsk',
} as const;

/** ids legíveis e ordenáveis por criação: sup_lq3k9x2a8f */
export function newId(entity: keyof typeof PREFIX): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${PREFIX[entity]}_${time}${rand}`;
}
