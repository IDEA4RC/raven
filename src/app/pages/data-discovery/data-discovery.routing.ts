import { Routes } from '@angular/router';


import { MetadataSearchComponent } from './metadata-search/metadata-search.component';

export const DiscoveryRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'metadata-search',
        component: MetadataSearchComponent,
        data: {
          title: 'Metadata Search',
          urls: [
            { title: 'Home', url: '/discovery/metadata-search' },
            { title: 'Metadata Search' },
          ],
        },
      },
    ],
  },
];
