import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-spinner',
  imports: [MatProgressSpinnerModule],
  template: `<div class="spinner-wrap"><mat-spinner diameter="48" /></div>`,
  styles: [`.spinner-wrap { display:flex; justify-content:center; padding:48px 0; }`]
})
export class SpinnerComponent {}
