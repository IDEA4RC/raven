import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { MatSidenav } from '@angular/material/sidenav';
import { CoreService } from 'src/app/services/core.service';
import { AppSettings } from 'src/app/app.config';
import { navItems } from './vertical/sidebar/sidebar-data';
import { NavService } from '../../services/nav.service';
import { NgScrollbarModule } from 'ngx-scrollbar';
import {
  AppSearchDialogComponent,
  HeaderComponent,
} from './vertical/header/header.component';
import { AppHorizontalHeaderComponent } from './horizontal/header/header.component';
import { AppHorizontalSidebarComponent } from './horizontal/sidebar/sidebar.component';
import { SidebarComponent } from './vertical/sidebar/sidebar.component';
import { AppBreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { CustomizerComponent } from './shared/customizer/customizer.component';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppNavItemComponent } from './vertical/sidebar/nav-item/nav-item.component';
import { FullService } from './full.service';
import { AuthService } from 'src/app/services/auth.service';
import { Router, NavigationEnd } from '@angular/router';

const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';
const MONITOR_VIEW = 'screen and (min-width: 1024px)';
const BELOWMONITOR = 'screen and (max-width: 1023px)';
@Component({
  selector: 'app-full',
  templateUrl: './full.component.html',
  standalone: true,
  imports: [
    NgScrollbarModule,
    HeaderComponent,
    AppHorizontalHeaderComponent,
    AppHorizontalSidebarComponent,
    SidebarComponent,
    AppBreadcrumbComponent,
    AppSearchDialogComponent,
    CustomizerComponent,
    MaterialModule,
    RouterModule,
    CommonModule,
    AppNavItemComponent,
  ],
  styleUrls: [],
  encapsulation: ViewEncapsulation.None,
})
export class FullComponent implements OnInit {
   navItems = navItems;
  @ViewChild('leftsidenav') public sidenav: MatSidenav;

  resView = false;
  options = this.settings.getOptions();
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  // The workspace that is currently using the user
  currentWorkspace: any = null;


  get isOver(): boolean {
    return this.isMobileScreen;
  }

  get isTablet(): boolean {
    return this.resView;
  }

  // // Observables
  // observable_wokspace$ : Observable<any> | undefined;



  // Subscriptions container
  private subscriptions: Subscription = new Subscription();

  
  constructor(
    private settings: CoreService,
    private mediaMatcher: MediaMatcher,
    private navService: NavService,
    private breakpointObserver: BreakpointObserver,
    private fullService: FullService,
    private authService: AuthService,
    private router: Router
  ) {
    
    this.htmlElement = document.querySelector('html')!;
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW, MONITOR_VIEW, BELOWMONITOR])
      .subscribe((state) => {
        // SidenavOpened must be reset true when layout changes
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[BELOWMONITOR];

        if (this.options.sidenavCollapsed == false) {
          this.options.sidenavCollapsed = state.breakpoints[TABLET_VIEW];
        }
        this.isContentWidthFixed = state.breakpoints[MONITOR_VIEW];
        this.resView = state.breakpoints[BELOWMONITOR];
      });

    // Initialize project theme with options
    this.receiveOptions(this.options);
  }

  ngOnInit(): void {
    // Subscribe to authentication status
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isLoggedIn => {
        if (isLoggedIn) {
          // If the user is logged in, load the default workspace
          // this.fullService.getWorkspace('default');
          this.updateNavItems(true);

          // }
        } else {
          // If not logged in, reset navItems to default
          this.updateNavItems(false);
        }
      })
    );
    // Subscribe to route changes
    this.subscriptions.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          // Detect if the current route is for an individual workspace
          const match = event.urlAfterRedirects.match(/\/workspace\/(\d+)/);
          const workspaceId = match ? match[1] : null;
          if (workspaceId) {
            this.fullService.getWorkspace(workspaceId);
          } else {
            this.fullService.currentWorkspace = null;
            this.updateNavItems(true);
          }
        }
      })
    );
    // Subscribe to workspace changes
    this.subscriptions.add(
      this.fullService.workspace$.subscribe(workspace => {
        this.fullService.currentWorkspace = workspace;
        if (this.authService.getToken()) {
          this.updateNavItems(true, workspace);
        }
      })
    );

    // Inicialize the menu depending the status of the token
    const isLoggedIn = !!this.authService.getToken();
    if (isLoggedIn) {
      // this.fullService.getWorkspace('default');
      this.updateNavItems(true);
    } else {
      this.updateNavItems(false);
    }
  
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
    
    // Also unsubscribe from your existing subscription
    this.layoutChangesSubscription.unsubscribe();
  }

  // Método para actualizar el menú
  private updateNavItems(isLoggedIn: boolean, workspace?: any) {
    console.log(`Updating nav items. Logged in: ${isLoggedIn}, Workspace:`, workspace);
    
    if (!isLoggedIn) {
      this.navItems = [
        { navCap: '' },
        { displayName: 'Log In', iconName: 'login', route: '/authentication/login' }
      ];
      return;
    } 
    // 🔹 Base menu para usuarios autenticados
    const newNavItems: any[] = [
      { navCap: '' },
      { displayName: 'My Workspace', iconName: 'layout-grid', route: '/workspace' }
    ];

    // 🔹 Si hay workspace, añadimos las secciones
    if (workspace) {
      newNavItems.push({
        navCap: '',
        displayName: (() => {
          const name = workspace.name ?? 'Workspace';
          return name.length > 20 ? name.slice(0, 20) + '...' : name;
        })(),
        iconName: 'assignment',
        route: `/workspace/${workspace.id}/data-discovery`,
        children: [
          { displayName: 'Data Discovery', iconName: 'search', route: `/workspace/${workspace.id}/data-discovery` },
          { displayName: 'Data Permit', iconName: 'lock-open', route: `/workspace/${workspace.id}/data-permit` },
          { displayName: 'Data Analysis', iconName: 'chart-line', route: `/workspace/${workspace.id}/data-analysis` },
          { displayName: 'Data Finalization', iconName: 'check', route: `/workspace/${workspace.id}/data-finalization` }
        ]
      });
    }
    

    console.log("New Nav Items:", newNavItems);
    this.navItems = newNavItems;
  }


  toggleCollapsed() {
    this.isContentWidthFixed = false;
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }

  resetCollapsedState(timer = 400) {
    setTimeout(() => this.settings.setOptions(this.options), timer);
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
    this.settings.setOptions(this.options);
  }

  receiveOptions(options: AppSettings): void {
    this.options = options;
    this.toggleDarkTheme(options);
  }

  toggleDarkTheme(options: AppSettings) {
    if (options.theme === 'dark') {
      this.htmlElement.classList.add('dark-theme');
      this.htmlElement.classList.remove('light-theme');
    } else {
      this.htmlElement.classList.remove('dark-theme');
      this.htmlElement.classList.add('light-theme');
    }
  }
}
