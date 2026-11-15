
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';

  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  login() {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.loading) {
      return;
    }

    this.loading = true;

    this.authService.login({
      email: this.email.trim(),
      password: this.password,
    }).subscribe({
    next: (response) => {
  this.loading = false;

  this.authService.saveSession(response);

  const user = response.user;

        console.log('Usuario autenticado:', user);
        console.log('Rol:', user.role);

        if (user.role === 'client') {
          this.router.navigate(['/cliente']);
          return;
        }

        if (user.role === 'worker') {
          if (user.reviewStatus === 'pending') {
            this.router.navigate(['/trabajador/pendiente']);
            return;
          }

          if (user.reviewStatus === 'approved') {
            this.router.navigate(['/trabajador']);
            return;
          }

          if (user.reviewStatus === 'rejected') {
            this.router.navigate(['/trabajador/rechazado']);
            return;
          }
        }

        this.errorMessage = 'No se pudo determinar el rol o estado de la cuenta.';
      },

      error: (error) => {
        this.loading = false;

        const message = error.error?.message;

        this.errorMessage = Array.isArray(message)
          ? message.join(' ')
          : message || 'No se pudo iniciar sesión.';
      },
    });
  }
}
