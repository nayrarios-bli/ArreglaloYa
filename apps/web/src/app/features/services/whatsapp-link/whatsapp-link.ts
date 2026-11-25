import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-whatsapp-link',
  templateUrl: './whatsapp-link.html',
  styleUrl: './whatsapp-link.css',
})
export class WhatsappLink {
  phone = input<string | null>(null);
  message = input('Hola, te escribo por el servicio en ArreglaloYa.');

  url = computed(() => {
    let digits = (this.phone() ?? '').replace(/\D/g, '');

    if (digits.length === 8) {
      digits = `591${digits}`;
    }

    if (!/^591\d{8}$/.test(digits)) {
      return null;
    }

    return `https://wa.me/${digits}?text=${encodeURIComponent(this.message())}`;
  });
}