import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-worker-rejected',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './rejected.html',
  styleUrl: './rejected.css',
})
export class WorkerRejected {}
