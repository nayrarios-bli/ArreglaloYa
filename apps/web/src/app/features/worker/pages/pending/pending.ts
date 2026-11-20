
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-worker-pending',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './pending.html',
  styleUrl: './pending.css',
})
export class WorkerPending {}
