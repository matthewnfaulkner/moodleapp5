// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Component, ElementRef, ViewChild, OnInit, Input, SkipSelf, Optional } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, ControlContainer, FormGroupDirective } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CoreUserParticipant } from '@/core/features/user/services/user';
import { asyncObservable } from '@/core/utils/rxjs';
import { map, switchMap, debounceTime } from 'rxjs/operators';
import { WSObservable } from '@classes/sites/authenticated-site';
import { firstValueFrom, from, of } from 'rxjs';
import { CoreSites } from '@services/sites';
import { CoreError } from '@classes/errors/error';
import { CoreLogger } from '@singletons/logger';

/**
 * @title Require an autocomplete option to be selected
 */
@Component({
  selector: 'addon-mod-data-field-consent-autocomplete',
  templateUrl: 'autocomplete.html',
  styleUrl: 'autocomplete.css',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
  ],
})
export class AddonModDataFieldConsentAutocompleteComponent implements OnInit {

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  @Input() courseid = 0;
  @Input() groupid?: number  = 0;
  @Input() formControlName = '';
  control!: FormControl;
  filteredOptions: AddonModDataFieldConsentAutocompleteOptions = [];
  filteredOptionsMap: Record<number, CoreUserParticipant> = {};
  options: AddonModDataFieldConsentAutocompleteOptions;
  search?: string = '';
  searchanywhere?: boolean = true;
  page?: number = 0;
  perpage?: number = 30;

  protected logger = CoreLogger.getInstance('CoreCompileProvider');

  constructor(@Optional() @SkipSelf() private controlContainer:  ControlContainer) {
    this.options = [];

  }

  ngOnInit(): undefined {

    if (this.formControlName && this.controlContainer?.control instanceof FormGroupDirective) {
      const parentFormGroup = this.controlContainer.control.form;
      this.control = parentFormGroup.get(this.formControlName) as FormControl;
    } else if (this.formControlName && this.controlContainer?.control) {
      this.control = this.controlContainer.control.get(this.formControlName) as FormControl;
    } else {
      // fallback (standalone)
      this.control = new FormControl('');
    }

    this.control.valueChanges
      .pipe(
        debounceTime(300),
        switchMap(value => this.loadOptions(value || '')),
      )
      .subscribe(options => this.filteredOptions = options);
  }

    /**
     * Wrapper that converts your existing Promise to an Observable
     * and extracts the actual array of options.
     */
  private loadOptions(search: string) {
    if (!search) {
      return of([]);
    }

    // Convert the existing Promise-based method to an Observable
    return from(
      this.getOptions(
        this.courseid,      // example courseid
        this.groupid,
        search,
        true,     // searchanywhere
        0,
        30,
      ),
    ).pipe(
      // Map the response object to the array of options
      // Adjust 'response.options' to match your data structure
      switchMap(response => {
        const options = response || [];

        return of(options);
      }),
    );
  }

    /**
     * Get dashboard blocks.
     *
     * @param userid User ID. Default, current user.
     * @param qrlogin Site ID. If not defined, current site.
     * @returns Promise resolved with the list of blocks.
     */
    private getOptions(
        courseid: number,
        groupid?: number,
        search: string = '',
        searchanywhere: boolean = false,
        page: number = 0,
        perpage: number = 0,
    ): Promise<AddonModDataFieldConsentAutocompleteOptions> {
        return Promise.resolve(firstValueFrom(this.getOptionsFromObservable({
            courseid,
            groupid,
            search,
            searchanywhere,
            page,
            perpage,
        })));
    }

    /**
     * Get dashboard blocks.
     *
     * @param params Options.
     * @returns observable that returns the list of blocks.
     */
    private getOptionsFromObservable(params: AddonModDataFieldConsentAutocompleteOptionsParams):
    WSObservable<AddonModDataFieldConsentAutocompleteOptions> {
        return this.getOptionsFromWSObservable(params).pipe(map(configs => configs));
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param params Options.
     * @returns Observable that returns the list of blocks.
     * @since 3.6
     */
    getOptionsFromWSObservable(params: AddonModDataFieldConsentAutocompleteOptionsParams):
    WSObservable<AddonModDataFieldConsentAutocompleteOptions> {
        return asyncObservable(async () => {

                const site =  CoreSites.getCurrentSite();
                if (site === undefined) {
                    throw new CoreError('no current site');
                }
                const observable = site.readObservable<AddonModDataFieldConsentAutocompleteOptionsResponse>(
                    'datafield_consent_search_users',
                    params,
                );

                return observable.pipe(map(result => result));

        });
    }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.loadOptions(filterValue).subscribe(options => {
      this.filteredOptions = options; // still an array
      this.filteredOptionsMap = options.reduce((acc, option) => {
        acc[option.id] = option;

        return acc;
      }, {} as Record<number, CoreUserParticipant>);
    });
  }

  displayFn(id: number): string {
    return this.filteredOptionsMap[id]?.fullname || '';
  }

}

type AddonModDataFieldConsentAutocompleteOptionsParams = {
    courseid: number;
    groupid?: number;
    search?: string;
    searchanywhere?: boolean;
    page: number;
    perpage: number;
};

type AddonModDataFieldConsentAutocompleteOptions = CoreUserParticipant[];

type AddonModDataFieldConsentAutocompleteOptionsResponse = CoreUserParticipant[];
