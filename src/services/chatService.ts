import { apiFetch } from './api';

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
   */
  consultar: (
    usuarioId: number,
    conversacionId: number,
    consulta: string
  ): Promise<ChatResponse> =>
    apiFetch('/Chat/consultar', {
      method: 'POST',
      body: JSON.stringify({
        usuarioId,
        conversacionId,
        consulta,
      }),
    }),
};