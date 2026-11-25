export class Review {
  id: string;
  requestId: string;
  clientId: string;
  workerId: string;
  rating: number; // HU-09: Calificación de 1 a 5 estrellas
  comment: string; // HU-10: Comentarios y opiniones
  createdAt: Date;
}