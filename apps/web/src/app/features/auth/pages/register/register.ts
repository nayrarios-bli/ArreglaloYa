
import { Component } from '@angular/core';
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

  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
  ) {}

  register() {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    this.authService.register({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim(),
      role: this.role,
    }).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.emailConfirmationRequired) {
          this.successMessage =
            '¡Cuenta creada correctamente! Te enviamos un correo de verificación. Revisa tu bandeja de entrada para activar tu cuenta.';
        } else {
          this.successMessage =
            '¡Cuenta creada correctamente! Ya puedes iniciar sesión.';
        }

        this.fullName = '';
        this.email = '';
        this.phone = '';
        this.password = '';
        this.confirmPassword = '';
        this.role = 'client';
      },

      error: (error) => {
        this.loading = false;

        const message = error.error?.message;

        this.errorMessage = Array.isArray(message)
          ? message.join(' ')
          : message || 'No se pudo completar el registro.';
      },
    });
  }
}
