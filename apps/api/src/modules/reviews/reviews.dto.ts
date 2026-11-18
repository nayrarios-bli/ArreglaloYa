
export class CreateReviewDto {
  serviceId: string;
  reviewerId: string; // Quién emite la calificación (Cliente o Trabajador)
  reviewedUserId: string; // A quién se está calificando
  rating: number; // Puntuación (1 al 5)
  comment?: string; // Comentario opcional
  roleType: 'CLIENT_TO_WORKER' | 'WORKER_TO_CLIENT'; // Para saber qué rol emite la calificación
}