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

import { NgModule, provideAppInitializer } from '@angular/core';
import { AddonModDataFieldsDelegate } from '../../services/data-fields-delegate';
import { AddonModDataFieldConsentHandler } from './services/handler';
import { AddonModDataFieldConsentPushClickHandler } from './services/handlers/push-click';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonModDataDatafieldConsentLinkHandler } from './services/handlers/consent-link';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { Routes } from '@angular/router';
import { ADDON_DATAFIELD_CONSENT_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

const routes: Routes = [
    {
        path: ADDON_DATAFIELD_CONSENT_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId/consent/:recordId',
                loadComponent: () => import('./pages/consent/consent'),
                canDeactivate: [canLeaveGuard],
            },
        ],
    },
];
@NgModule({
    imports: [
            CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            AddonModDataFieldsDelegate.registerHandler(AddonModDataFieldConsentHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModDataDatafieldConsentLinkHandler.instance);
            CorePushNotificationsDelegate.registerClickHandler(AddonModDataFieldConsentPushClickHandler.instance);
        }),
    ],
})
export class AddonModDataFieldConsentModule {}
