// topography.service.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TopographyService {

    private readonly topographyMap$: Observable<Record<string, string>>;

    constructor(private http: HttpClient) {
        this.topographyMap$ = this.http
            .get<Record<string, string>>('assets/jsons/topography_map.json')
            .pipe(
                shareReplay(1)
            );
    }

    getTopographyMap(): Observable<Record<string, string>> {
        return this.topographyMap$;
        
    }
}