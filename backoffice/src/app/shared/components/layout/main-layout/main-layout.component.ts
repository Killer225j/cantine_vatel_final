import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  /** Repliée d'office sur tablette et téléphone : le contenu garde toute la largeur. */
  sidebarCollapsed = signal(typeof window !== 'undefined' && window.innerWidth < 1024);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }
}
