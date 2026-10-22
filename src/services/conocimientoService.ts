import { storage } from './storage';

/** Catálogo local (hasta que el backend exponga /api/Packs) */
export type PackCultivo = {
  id: string;
  cultivo: string;
  titulo: string;
  descripcion: string;
  tamanoAprox: string;
};

export const PACKS_DISPONIBLES: PackCultivo[] = [
  {
    id: 'quinua',
    cultivo: 'quinua',
    titulo: 'Manual BPA Quinua',
    descripcion: 'Siembra, plagas (trips, pulgones) y manejo en sierra.',
    tamanoAprox: '~2–5 MB',
  },
  {
    id: 'papa',
    cultivo: 'papa',
    titulo: 'Guía Papa andina',
    descripcion: 'Tizón, polilla, fertilización y cosecha.',
    tamanoAprox: '~2–5 MB',
  },
  {
    id: 'maiz',
    cultivo: 'maíz',
    titulo: 'Maíz de altura',
    descripcion: 'Plagas, densidades y manejo local.',
    tamanoAprox: '~2–5 MB',
  },
];

const KEY = 'packs_descargados';

export async function listarDescargados(): Promise<string[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function marcarDescargado(id: string) {
  const actual = await listarDescargados();
  if (actual.includes(id)) return;
  await storage.set(KEY, JSON.stringify([...actual, id]));
}

export async function quitarDescargado(id: string) {
  const actual = await listarDescargados();
  await storage.set(KEY, JSON.stringify(actual.filter((x) => x !== id)));
}