
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role: 'client' | 'worker' = 'client';

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  register(): void {
    this.errorMessage.set('');

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    this.authService.register({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim(),
      role: this.role,
    }).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response.session) {
          this.authService.saveSession({
            message: response.message,
            user: response.user,
            session: response.session,
          });

          if (response.user.role === 'client') {
            this.router.navigate(['/']);
          } else {
            this.router.navigate(['/trabajador/pendiente']);
          }
          return;
        }

        this.router.navigate(['/login'], {
          queryParams: { registered: 'confirmation-required' },
        });
      },

      error: (error) => {
        this.loading.set(false);

        const message = error.error?.message;

        this.errorMessage.set(
          Array.isArray(message)
            ? message.join(' ')
            : message || 'No se pudo completar el registro.',
        );
      },
    });
  }
}
