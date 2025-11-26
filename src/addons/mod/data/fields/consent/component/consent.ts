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

import { Component } from '@angular/core';
import { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { CoreFileEntry } from '@services/file-helper';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModDataFieldConsentSignaturePadComponent } from './signature-pad/signature-pad';
import { AddonModDataFieldConsentAutocompleteComponent } from './autocomplete/autocomplete';
import { CoreUserProvider, CoreUserProfile } from '@/core/features/user/services/user';
import { CoreError } from '@classes/errors/error';
import { Translate } from '@singletons';
import { CoreSites } from '@/core/services/sites';
import {
    AddonModDataEntryField,
    AddonModDataField,
    AddonModDataSubfieldData,
} from '@addons/mod/data/services/data';
/**
 * Component to render data file field.
 */
@Component({
    selector: 'addon-mod-data-field-consent',
    templateUrl: 'addon-mod-data-field-consent.html',
    imports: [
    CoreSharedModule,
    AddonModDataFieldConsentSignaturePadComponent,
    AddonModDataFieldConsentAutocompleteComponent,

],
})
export class AddonModDataFieldConsentComponent extends AddonModDataFieldPluginBaseComponent {

    files: CoreFileEntry[] = [];
    file?: CoreFileEntry;
    component?: string;
    componentId?: number;
    maxSizeBytes?: number;
    isSubmitter?: string;
    submitterId?: number;
    options: {
        key: string;
        value: string;
    }[] = [];

    groupid?: number;

    user?: CoreUserProfile | undefined;

    /**
     * Get the files from the input value.
     *
     * @param value Input value.
     * @returns List of files.
     */
    protected getFile(value?: Partial<AddonModDataEntryField>): CoreFileEntry {
        const files = value?.files || [];
        const file = files[0];

        return file;
    }

    /**
     * @inheritdoc
     */
    protected init(): void {
        if (this.searchMode) {
            this.addControl(`f_${this.field.id}`);

            return;
        }

        this.component = ADDON_MOD_DATA_COMPONENT_LEGACY;
        this.componentId = this.database!.coursemodule;
        this.isSubmitter = this.field.param1;

        this.groupid = +this.field.param7;

        if(this.isSubmitter) {
            this.submitterId = CoreSites.getCurrentSiteUserId();
        }
        this.updateValue(this.value);
        if (this.editMode) {
            this.addControl(`f_${this.field.id}_0`, this.submitterId);
            this.addControl(`f_${this.field.id}_1`, null);
            this.addControl(`f_${this.field.id}_2`, '');
        }

    }

    protected async getUser(userid: number): Promise<CoreUserProfile> {
        const userProvider = new CoreUserProvider();
        const user = await userProvider.getProfile(userid);

        return user;
    }

    /**
     * @inheritdoc
     */
    protected updateValue(value?: Partial<AddonModDataEntryField>): void {
        this.value = value;
        if(value !== undefined) {
            if(value.content !== undefined) {
                 this.getUser(+value.content).then(user => {
                    this.user = user;

                    return true;
                 })  .catch(error => {
                        throw new CoreError('Error loading user:', error);
                    });;
                }
            }
            this.file = this.getFile(value);
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (!field.required) {
            return;
        }

        if (!inputData || !inputData.length) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }

        const found = inputData.some((input) => {
            if (input.subfield !== undefined && input.subfield == 'file') {
                return !!input.value;
            }

            return false;
        });

        if (!found) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
    }

}
