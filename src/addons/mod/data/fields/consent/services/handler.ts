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

import {
    AddonModDataEntryField,
    AddonModDataField,
    AddonModDataSearchEntriesAdvancedFieldFormatted,
    AddonModDataSubfieldData,
} from '@addons/mod/data/services/data';
import { AddonModDataFieldHandler } from '@addons/mod/data/services/data-fields-delegate';
import { Injectable, Type } from '@angular/core';
import { CoreFileSession } from '@services/file-session';
import { CoreFormFields } from '@singletons/form';
import { makeSingleton, Translate } from '@singletons';
import { CoreFileEntry } from '@services/file-helper';
import type { AddonModDataFieldPluginBaseComponent } from '@addons/mod/data/classes/base-field-plugin-component';
import { ADDON_MOD_DATA_COMPONENT_LEGACY } from '@addons/mod/data/constants';
import { DatafieldConsentfields } from '../constants';
import { CoreTime } from '@singletons/time';
/**
 * Handler for file data field plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldConsentHandlerService implements AddonModDataFieldHandler {

    name = 'AddonModDataFieldConsentHandler';
    type = 'consent';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<AddonModDataFieldPluginBaseComponent>> {
        const { AddonModDataFieldConsentComponent } = await import('../component/consent');

        return AddonModDataFieldConsentComponent;
    }

    /**
     * @inheritdoc
     */
    getFieldSearchData(field: AddonModDataField, inputData: CoreFormFields): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        const fieldName = `f_${field.id}`;

        if (inputData[fieldName]) {
            return [{
                name: fieldName,
                value: inputData[fieldName],
            }];
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(
                field: AddonModDataField,
                inputData: CoreFormFields,
        ): AddonModDataSubfieldData[] {
        const subfields: AddonModDataSubfieldData[] = [{
            fieldid: field.id,
            subfield: 'date',
            value: CoreTime.timestamp(),
        }];
        // const files = this.getFieldEditFiles(field);
        const fieldprefix = `f_${field.id}`;
        const userid = inputData[`${fieldprefix}_${DatafieldConsentfields.user}`];

        if(userid) {
            const usersubfield = {
                fieldid: field.id,
                subfield: 'user',
                value: userid,
            };
            subfields.push(usersubfield);
        }

        const consent = inputData[`${fieldprefix}_${DatafieldConsentfields.consent}`];

        if (consent == true) {
            const consentsubfield = {
                fieldid: field.id,
                subfield: 'consent',
                value: consent,
            };
            subfields.push(consentsubfield);
        }
        const signature = inputData[`${fieldprefix}_${DatafieldConsentfields.signature}`];

        if (signature !== '') {
            const signaturesubfield = {
                fieldid: field.id,
                subfield: 'file',
                value: signature,
            };
            subfields.push(signaturesubfield);
        }

        return subfields;

    }

    /**
     * @inheritdoc
     */
    getFieldEditFiles(field: AddonModDataField): CoreFileEntry[] {
        return CoreFileSession.getFiles(ADDON_MOD_DATA_COMPONENT_LEGACY, `${field.dataid}_${field.id}`);
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(field: AddonModDataField, inputData: CoreFormFields, originalFieldData: AddonModDataEntryField): boolean {
        const fieldprefix = `f_${field.id}`;

        const isSubmitter =  inputData[fieldprefix];

        if(isSubmitter === null) {
            const userid = inputData[`${fieldprefix}_${DatafieldConsentfields.user}`];
            if(userid != originalFieldData.content) {
                return false;
            }
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(field: AddonModDataField, inputData: AddonModDataSubfieldData[]): string | undefined {
        if (field.required && (!inputData || !inputData.length || !inputData[0].value)) {
            return Translate.instant('addon.mod_data.errormustsupplyvalue');
        }
        const fieldprefix = `f_${field.id}`;
        const isSubmitter =  inputData[fieldprefix];
        const userid = inputData[`${fieldprefix}_${DatafieldConsentfields.user}`];

        if (!userid) {
            return Translate.instant('addon.mod_data.noconsentuserselected');
        }

        if(isSubmitter === true) {
            const consent = inputData[`${fieldprefix}_${DatafieldConsentfields.consent}`];
            if(consent !== true) {
                return Translate.instant('addon.mod_data.noconsentgiven');
            }

            const signature = inputData[`${fieldprefix}_${DatafieldConsentfields.signature}`];
            if(signature === '') {
                return Translate.instant('addon.mod_data.nosignature');
            }
        }

    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
export const AddonModDataFieldConsentHandler = makeSingleton(AddonModDataFieldConsentHandlerService);
