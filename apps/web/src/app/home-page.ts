import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogApiService } from './core/catalog-api.service.js';

@Component({
  imports: [RouterLink],
  selector: 'app-home-page',
  styleUrl: './home-page.css',
  templateUrl: './home-page.html',
})
export class HomePage implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);

  ngOnInit(): void {
    this.catalogApi.getCategories().subscribe({ error: () => undefined });
  }
}
