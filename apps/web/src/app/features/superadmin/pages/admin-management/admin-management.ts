
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth.service';
import {
  Admin,
  CreateAdminPayload,
  SuperadminApiService,
  UpdateAdminPayload,
} from '../../superadmin-api.service';

interface AdminForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-management.html',
  styleUrls: ['./admin-management.css', '../../../admin/admin-panels.css'],
})
export class AdminManagement implements OnInit {
  admins: Admin[] = [];

  searchTerm = '';

  isLoading = false;
  isSaving = false;

  showForm = false;
  showDetails = false;

  selectedAdmin: Admin | null = null;
  editingAdmin: Admin | null = null;

  errorMessage = '';
  successMessage = '';

  form: AdminForm = this.emptyForm();

  constructor(
    private readonly authService: AuthService,
    private readonly superadminApi: SuperadminApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAdmins();
  }

  // =====================================================
  // DATOS Y AUTENTICACIÓN
  // =====================================================

  private getToken(): string | null {
    const user = this.authService.getUser();
    const token = this.authService.getAccessToken();

    if (!user || user.role !== 'superadmin' || !token) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return null;
    }

    return token;
  }

  loadAdmins(): void {
    const token = this.getToken();

    if (!token) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.superadminApi.getAdmins(token).subscribe({
      next: (admins) => {
        this.admins = admins;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message ??
          'No se pudieron cargar los administradores.';

        this.isLoading = false;
      },
    });
  }

  // =====================================================
  // INDICADORES Y BÚSQUEDA
  // =====================================================

  get activeCount(): number {
    return this.admins.filter((admin) => admin.isActive).length;
  }

  get inactiveCount(): number {
    return this.admins.filter((admin) => !admin.isActive).length;
  }

  get filteredAdmins(): Admin[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.admins;
    }

    return this.admins.filter((admin) =>
      `${admin.full_name} ${admin.email}`
        .toLowerCase()
        .includes(term),
    );
  }

  // =====================================================
  // FORMULARIO
  // =====================================================

  private emptyForm(): AdminForm {
    return {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    };
  }

  openCreateForm(): void {
    this.editingAdmin = null;
    this.selectedAdmin = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.showForm = true;
    this.showDetails = false;
  }

  openEditForm(admin: Admin): void {
    const token = this.getToken();

    if (!token) {
      return;
    }

    this.errorMessage = '';

    this.superadminApi.getAdminById(admin.id, token).subscribe({
      next: (data) => {
        this.editingAdmin = data;
        this.form = {
          fullName: data.full_name,
          email: data.email,
          phone: data.phone ?? '',
          password: '',
        };

        this.showDetails = false;
        this.showForm = true;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message ??
          'No se pudieron consultar los datos del administrador.';
      },
    });
  }

  closeForm(): void {
    if (this.isSaving) {
      return;
    }

    this.showForm = false;
    this.editingAdmin = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
  }

  saveAdmin(): void {
    const token = this.getToken();

    if (!token || this.isSaving) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const fullName = this.form.fullName.trim();
    const email = this.form.email.trim();
    const phone = this.form.phone.trim();
    const password = this.form.password;

    if (!fullName || !email) {
      this.errorMessage = 'Completa el nombre y el correo electrónico.';
      return;
    }

    if (!this.editingAdmin && !password) {
      this.errorMessage = 'La contraseña es obligatoria para crear la cuenta.';
      return;
    }

    if (!this.editingAdmin && password.length < 8) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    if (password && (password.length < 12 || password.length > 72) && this.editingAdmin) {
      this.errorMessage =
        'La contraseña debe tener entre 12 y 72 caracteres.';
      return;
    }

    if (phone && !/^[0-9]{7,15}$/.test(phone)) {
      this.errorMessage =
        'El teléfono debe contener entre 7 y 15 dígitos.';
      return;
    }

    this.isSaving = true;

    if (this.editingAdmin) {
      const payload: UpdateAdminPayload = {
        fullName,
        email,
        phone,
      };

      if (password) {
        payload.password = password;
      }

      this.superadminApi
        .updateAdmin(this.editingAdmin.id, payload, token)
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.showForm = false;
            this.successMessage =
              'Administrador actualizado correctamente.';

            this.editingAdmin = null;
            this.form = this.emptyForm();
            this.loadAdmins();
          },
          error: (error) => {
            this.isSaving = false;
            this.errorMessage =
              error.error?.message ??
              'No se pudo actualizar el administrador.';
          },
        });

      return;
    }

    const payload: CreateAdminPayload = {
      fullName,
      email,
      password,
    };

    if (phone) {
      payload.phone = phone;
    }

    this.superadminApi.createAdmin(payload, token).subscribe({
      next: () => {
        this.isSaving = false;
        this.showForm = false;
        this.successMessage =
          'Administrador creado correctamente.';

        this.form = this.emptyForm();
        this.loadAdmins();
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage =
          error.error?.message ??
          'No se pudo crear el administrador.';
      },
    });
  }

  // =====================================================
  // CONSULTAR DETALLES
  // =====================================================

  viewAdmin(admin: Admin): void {
    const token = this.getToken();

    if (!token) {
      return;
    }

    this.errorMessage = '';

    this.superadminApi.getAdminById(admin.id, token).subscribe({
      next: (data) => {
        this.selectedAdmin = data;
        this.showDetails = true;
        this.showForm = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message ??
          'No se pudieron consultar los datos del administrador.';
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedAdmin = null;
  }

  // =====================================================
  // ACTIVAR Y DESACTIVAR
  // =====================================================

  toggleAdminStatus(admin: Admin): void {
    const token = this.getToken();

    if (!token) {
      return;
    }

    const action = admin.isActive ? 'desactivar' : 'reactivar';

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas ${action} la cuenta de ${admin.full_name}?`,
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const request = admin.isActive
      ? this.superadminApi.deactivateAdmin(admin.id, token)
      : this.superadminApi.activateAdmin(admin.id, token);

    request.subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadAdmins();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message ??
          `No se pudo ${action} la cuenta.`;
      },
    });
  }

  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
