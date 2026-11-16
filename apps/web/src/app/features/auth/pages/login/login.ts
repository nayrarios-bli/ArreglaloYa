import { Component, signal } from '@angular/core';
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

  readonly loading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  login(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    this.authService
      .login({
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.authService.saveSession(response);

          const user = response.user;

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

          this.errorMessage.set(
            'No se pudo determinar el rol o estado de la cuenta.',
          );
        },

        error: (error) => {
          this.loading.set(false);

          const message = error.error?.message;
          this.errorMessage.set(
            Array.isArray(message)
              ? message.join(' ')
              : message || 'No se pudo iniciar sesión.',
          );
        },
      });
  }
}