import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly authService = inject(AuthService);
  private readonly session = toSignal(this.authService.session$, {
    initialValue: this.authService.getSession(),
  });

  readonly user = computed(() => this.session()?.user ?? null);
  readonly firstName = computed(
    () => this.user()?.fullName.trim().split(/\s+/)[0] ?? 'Mi cuenta',
  );
  readonly dashboardLink = computed(() => {
    const user = this.user();
    if (!user || user.role === 'client') return '/cliente';
    if (user.reviewStatus === 'approved') return '/trabajador';
    if (user.reviewStatus === 'rejected') return '/trabajador/rechazado';
    return '/trabajador/pendiente';
  });

  logout(): void {
    this.authService.logout();
  }
}
