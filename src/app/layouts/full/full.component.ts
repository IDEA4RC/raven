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
  @ViewChild('leftsidenav')
  public sidenav: MatSidenav;
  resView = false;
  //get options from service
  options = this.settings.getOptions();
  navopt = this.navService.showClass;
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  get isTablet(): boolean {
    return this.resView;
  }

  // Observables
  observable_wokspace$ : Observable<any> | undefined;
  // Subscriptions container
  private subscriptions: Subscription = new Subscription();

  
  constructor(
    private settings: CoreService,
    private mediaMatcher: MediaMatcher,
    private navService: NavService,
    private breakpointObserver: BreakpointObserver,
    private fullService: FullService
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
        console.log("AAAAAAAAAAAAAAAAAAAAAA", this.navItems);
    if(localStorage.getItem('access') === 'login') {
      this.navItems = [
        {
          navCap: '',
        },
        {
          displayName: 'My Workspace',
          iconName: 'layout-grid',
          route: '/workspace',
        }
      ]
    } else {
      this.navItems = [
        {
          navCap: '',
        },
        
        {
          displayName: 'Log In',
          iconName: 'login',
          route: '/authentication/login',
        }
      ]
    }

    
  
    // Get observables variables
    this.observable_wokspace$ = this.fullService.workspace;
    
    // Subscribe to the observable workspace and add to subscription container
    this.subscriptions.add(
      this.observable_wokspace$.subscribe((data) => {

      
      if (data) {
        // Add the workspace menu to the navItems
        this.navItems = [
          {
            navCap: '',
          },
          {
            displayName: 'My Workspace',
            iconName: 'layout-grid',
            route: '/workspace',
          },
          {
            navCap: '',
          },
          {
            displayName: data.name,
            iconName: 'assignment',
            route: `/workspace/individual-workspace/${data.id}`,
            children: [
              {
                displayName: 'Metadata Search',
                iconName: 'search',
                route: 'apps/blog/post',
              },
              {
                displayName: 'Data Access',
                iconName: 'lock_open',
                route: 'apps/blog/detail/Early Black Friday Amazon deals: cheap TVs, headphones',
              },
              {
                displayName: 'Data Analysis',
                iconName: 'deployed_code',
                route: 'apps/blog/post',
              },
              {
                displayName: 'Result Report',
                iconName: 'check',
                route: 'apps/blog/detail/Early Black Friday Amazon deals: cheap TVs, headphones',
              }
              
            ]
          }
        ];
      }
      
      })
    );

    // If the user is logged in, get the workspace data from the user
    if(localStorage.getItem('access') === 'login') {

      // Get the current route
      const currentUrl = window.location.pathname;
      const match = currentUrl.match(/\/workspace\/individual-workspace\/(\d+)/);
      const workspaceId = match ? match[1] : null;

      // Pass the workspace ID if available
      if (workspaceId) {
      }
      // Get the workspace data
      this.fullService.getWorkspace('1');
    }


  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
    
    // Also unsubscribe from your existing subscription
    this.layoutChangesSubscription.unsubscribe();
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
