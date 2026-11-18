export class Complaint {
  id: string;
  serviceId: string;
  complainantId: string; // Usuario que presenta el reclamo (Cliente o Trabajador)
  accusedUserId: string; // Usuario reportado
  reason: string; // Motivo principal del reclamo
  description: string; // Detalle de lo ocurrido
  evidenceUrl?: string; // Enlace opcional a captura o evidencia
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: Date;
}