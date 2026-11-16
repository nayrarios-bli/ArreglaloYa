
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  constructor(
    private readonly authService: AuthService,
  ) {}

  register(): void {
    this.successMessage.set('');
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

        if (response.emailConfirmationRequired) {
          this.successMessage.set(
            '¡Cuenta creada correctamente! Te enviamos un correo de verificación. Revisa tu bandeja de entrada para activar tu cuenta.',
          );
        } else {
          this.successMessage.set(
            '¡Cuenta creada correctamente! Ya puedes iniciar sesión.',
          );
        }

        this.fullName = '';
        this.email = '';
        this.phone = '';
        this.password = '';
        this.confirmPassword = '';
        this.role = 'client';
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
