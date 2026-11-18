export class UserProfile {
  id: string;
  userId: string;
  fullName: string;
  role: 'CLIENT' | 'WORKER';
  publicLocation: string; // Zona o ciudad general visible para todos (ej. "Cochabamba, Zona Norte")
  exactAddress?: string; // Dirección exacta protegida (solo visible con contrato/servicio activo)
  phone: string;
}
