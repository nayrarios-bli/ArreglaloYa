import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { CatalogApiService, type CatalogCategory } from '../../../core/catalog-api.service';
import {
  ServiceReportsApiService,
  type ReportHistoryItem,
  type ServiceReport,
} from './service-reports-api.service';

// Registra en Chart.js los tipos de gráfico, ejes, leyendas y tooltips.
Chart.register(...registerables);

const MAX_RANGE_DAYS = 366;
const COLORS = {
  requests: '#8fbfa8',
  completed: '#28795f',
  cancelled: '#c2410c',
};

@Component({
  selector: 'app-service-reports-page',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './service-reports.page.html',
  styleUrl: './service-reports.page.css',
})
export class ServiceReportsPage implements OnInit, OnDestroy {
  private readonly api = inject(ServiceReportsApiService);
  private readonly catalog = inject(CatalogApiService);

  // Los <canvas> donde Chart.js dibuja cada gráfico.
  @ViewChild('categoriesCanvas', { static: true })
  private categoriesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusCanvas', { static: true })
  private statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timelineCanvas', { static: true })
  private timelineCanvas!: ElementRef<HTMLCanvasElement>;

  // Gráficos dibujados actualmente (para poder destruirlos al actualizar).
  private charts: { destroy(): void }[] = [];

  readonly today = localToday();
  startDate = shiftDays(this.today, -29);
  endDate = this.today;
  categoryId = '';

  readonly categories = signal<CatalogCategory[]>([]);
  readonly report = signal<ServiceReport | null>(null);
  readonly history = signal<ReportHistoryItem[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.catalog.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.generate();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // Botones rápidos: últimos 7, 30 o 90 días.
  applyPreset(days: number): void {
    this.endDate = this.today;
    this.startDate = shiftDays(this.today, -(days - 1));
    this.generate();
  }

  clearCategory(): void {
    this.categoryId = '';
    this.generate();
  }

  // Volver a aplicar los filtros de un reporte anterior.
  useHistory(item: ReportHistoryItem): void {
    this.startDate = item.startDate;
    this.endDate = item.endDate;
    this.categoryId = item.categoryId ?? '';
    this.generate();
  }

  generate(): void {
    this.errorMessage.set('');

    // Validación rápida en el navegador; el backend vuelve a validar todo.
    const validationError = this.validateFilters();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.loading.set(true);
    this.api
      .generate({
        startDate: this.startDate,
        endDate: this.endDate,
        categoryId: this.categoryId || undefined,
      })
      .subscribe({
        next: (report) => {
          this.loading.set(false);
          this.report.set(report);
          this.renderCharts(report);
          this.loadHistory();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.extractMessage(error));
        },
      });
  }

  formatDay(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  private loadHistory(): void {
    this.api.history().subscribe({
      next: (items) => this.history.set(items),
      error: () => this.history.set([]),
    });
  }

  private validateFilters(): string | null {
    if (!this.startDate || !this.endDate) {
      return 'Elige la fecha inicial y la fecha final.';
    }
    if (this.startDate > this.endDate) {
      return 'La fecha inicial no puede ser posterior a la fecha final.';
    }
    if (this.endDate > this.today) {
      return 'La fecha final no puede ser posterior a hoy.';
    }
    if (daysBetween(this.startDate, this.endDate) + 1 > MAX_RANGE_DAYS) {
      return `El período no puede superar ${MAX_RANGE_DAYS} días.`;
    }
    return null;
  }

  private renderCharts(report: ServiceReport): void {
    this.destroyCharts();

    // 1. Barras horizontales: categorías más solicitadas.
    //    Al hacer clic en una barra se filtra el reporte por esa categoría.
    const categoriesChart = new Chart(this.categoriesCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: report.topCategories.map((item) => item.name),
        datasets: [
          { label: 'Solicitudes', data: report.topCategories.map((item) => item.requests), backgroundColor: COLORS.requests },
          { label: 'Atendidos', data: report.topCategories.map((item) => item.completed), backgroundColor: COLORS.completed },
          { label: 'Cancelados', data: report.topCategories.map((item) => item.cancelled), backgroundColor: COLORS.cancelled },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { position: 'bottom' } },
        onClick: (_event, elements) => {
          const selected = elements[0] ? report.topCategories[elements[0].index] : null;
          if (selected && selected.categoryId !== this.categoryId) {
            this.categoryId = selected.categoryId;
            this.generate();
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
        },
      },
    });

    // 2. Dona: servicios atendidos frente a cancelados.
    const statusChart = new Chart(this.statusCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Atendidos', 'Cancelados'],
        datasets: [
          {
            data: [report.summary.completedServices, report.summary.cancelledServices],
            backgroundColor: [COLORS.completed, COLORS.cancelled],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom' } },
      },
    });

    // 3. Línea: evolución diaria de atendidos y cancelados.
    const timelineChart = new Chart(this.timelineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: report.timeline.map((point) => this.formatDay(point.date).slice(0, 5)),
        datasets: [
          { label: 'Atendidos', data: report.timeline.map((point) => point.completed), borderColor: COLORS.completed, backgroundColor: COLORS.completed, tension: 0.3 },
          { label: 'Cancelados', data: report.timeline.map((point) => point.cancelled), borderColor: COLORS.cancelled, backgroundColor: COLORS.cancelled, tension: 0.3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { position: 'bottom' } },
      },
    });

    this.charts = [categoriesChart, statusChart, timelineChart];
  }

  // Cada gráfico se destruye antes de dibujarlo de nuevo, para no duplicarlo.
  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
      if (error.status === 403) return 'No tienes permisos para consultar los reportes.';
      if (error.status === 0) return 'No se pudo conectar con la API.';

      const message: unknown = error.error?.message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string' && message.trim()) return message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'No se pudo generar el reporte.';
  }
}

// Fecha de hoy según la hora local del navegador, en formato AAAA-MM-DD.
function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) /
      86_400_000,
  );
}
