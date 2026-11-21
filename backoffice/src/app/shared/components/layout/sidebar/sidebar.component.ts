import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService, Role } from '../../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  /** Absent sur un item qui n'est qu'un regroupement (cf children). */
  route?: string;
  /** Rôles qui voient l'entrée. Le menu n'autorise rien : les routes ont leur roleGuard. */
  roles: Role[];
  children?: NavItem[];
}

const TOUS: Role[] = ['ADMIN', 'CUISINE'];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  isCollapsed = input(false);
  toggleSidebar = output<void>();

  private authService = inject(AuthService);
  private router = inject(Router);

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi-th-large', route: '/dashboard', roles: TOUS },
    { label: 'Menus', icon: 'pi-calendar', route: '/menus', roles: ['ADMIN'] },
    { label: 'Plats', icon: 'pi-book', route: '/plats', roles: ['ADMIN'] },
    { label: 'Commandes', icon: 'pi-list-check', route: '/commandes', roles: TOUS },
    { label: 'Comptoir', icon: 'pi-qrcode', route: '/comptoir', roles: TOUS },
    { label: 'Anti-gaspillage', icon: 'pi-heart', route: '/anti-gaspi', roles: TOUS },
    { label: 'Stocks', icon: 'pi-box', route: '/stocks', roles: TOUS },
    { label: 'Rapports', icon: 'pi-chart-bar', route: '/rapports', roles: ['ADMIN'] },
  ];

  visibleItems = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role ? this.navItems.filter((i) => i.roles.includes(role)) : [];
  });

  /** Sous-menu ouvert : celui qui contient la route active au chargement. */
  expandedGroup = signal<string | null>(this.findActiveGroupLabel());

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  private findActiveGroupLabel(): string | null {
    const url = this.router.url;
    const match = this.navItems.find((i) =>
      i.children?.some((c) => c.route && url.startsWith(c.route)),
    );
    return match?.label ?? null;
  }

  isExpanded(item: NavItem): boolean {
    return this.expandedGroup() === item.label;
  }

  toggleGroup(item: NavItem): void {
    this.expandedGroup.set(this.isExpanded(item) ? null : item.label);
  }
}
