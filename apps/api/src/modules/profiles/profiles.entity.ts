export class Profile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  exactAddress: string; // HU-25: Dirección exacta protegida/oculta
  city: string;
  updatedAt: Date;
}