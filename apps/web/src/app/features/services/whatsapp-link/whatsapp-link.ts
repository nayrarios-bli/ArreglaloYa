import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-whatsapp-link',
  templateUrl: './whatsapp-link.html',
})
export class WhatsappLink {
  phone = input<string | null>(null);
  message = input('Hola, te escribo por el servicio en ArreglaloYa.');

  url = computed(() => {
    let digits = (this.phone() ?? '').replace(/\D/g, '');
    if (digits.length === 8) digits = '591' + digits;
    if (digits.length < 10) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(this.message())}`;
  });
}
