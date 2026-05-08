const repository = require('./repository');

const DEFAULT_QUEUES = [
  { name: 'Várzea Paulista (Centro)', slug: 'varzea-centro', menu_option: '1', description: 'Fila da unidade Várzea Paulista Centro' },
  { name: 'Várzea Paulista (Jd. América)', slug: 'varzea-jd-america', menu_option: '2', description: 'Fila da unidade Várzea Paulista Jardim América' },
  { name: 'Francisco Morato', slug: 'francisco-morato', menu_option: '3', description: 'Fila da unidade Francisco Morato' },
  { name: 'Taipas', slug: 'taipas', menu_option: '4', description: 'Fila da unidade Taipas' }
];

function buildUnitMenu() {
  return [
    'Olá 👋',
    'Bem-vindo à Tico Auto Peças.',
    'Selecione a unidade desejada para atendimento:',
    '',
    '1️⃣ Várzea Paulista (Centro)',
    '2️⃣ Várzea Paulista (Jd. América)',
    '3️⃣ Francisco Morato',
    '4️⃣ Taipas'
  ].join('\n');
}

async function seedDefaultQueues() {
  for (const queue of DEFAULT_QUEUES) {
    const existing = await repository.findBySlug(queue.slug);
    if (!existing) await repository.create(queue);
  }
}

module.exports = {
  DEFAULT_QUEUES,
  buildUnitMenu,
  seedDefaultQueues,
  listAll: repository.listAll,
  listActive: repository.listActive,
  findByOption: repository.findByOption,
  findById: repository.findById
};
