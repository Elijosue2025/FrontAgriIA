import { apiFetch } from './api';

export type ModoModelo = 'rapido' | 'preciso';

export type ChatResponse = {
  exito: boolean;
  respuesta: string;
  tokensUsados: number;
  fechaRespuesta: string;
  errorMensaje: string;
};

export const chatService = {
  /**
   * Si conversacionId = 0, el backend crea automáticamente una conversación.
   * modoModelo: "rapido" (3B) | "preciso" (7B)
   */
  consultar: (
    usuarioId: number,
    conversacionId: number,
    consulta: string,
    modoModelo: ModoModelo = 'preciso'
  ): Promise<ChatResponse> =>
    apiFetch('/Chat/consultar', {
      method: 'POST',
      body: JSON.stringify({
        usuarioId,
        conversacionId,
        consulta,
        modoModelo,
      }),
    }),
};