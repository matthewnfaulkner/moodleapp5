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

import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { CoreNavigator } from '@services/navigator';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { makeSingleton } from '@singletons';

import { isSafeNumber } from '@/core/utils/types';
import { ADDON_DATAFIELD_CONSENT_FEATURE_NAME, ADDON_DATAFIELD_CONSENT_PAGE_NAME } from '../../constants';

/**
 * Handler for forum push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataFieldConsentPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonModDataFieldConsentPushClickHandler';
    priority = 200;
    featureName = ADDON_DATAFIELD_CONSENT_FEATURE_NAME;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: NotificationData): Promise<boolean> {
        return CoreUtils.isTrueOrOne(notification.notif)
            && notification.name == 'consentnotification'
            && !!(notification.contexturl);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: NotificationData): Promise<void> {
        const contextUrlParams = CoreUrl.extractUrlParams(notification.contexturl);
        const data = notification.customdata || {};
        const courseId = Number(notification.courseid);
        const recordId = Number(contextUrlParams.rid || data.recordId);
        const fieldId  = Number(contextUrlParams.fid || data.fieldId);
        const cmId = data.cmid && Number(data.cmid);
        const pageParams: Params = {
            forumId: Number(data.instance),
            cmId,
            courseId,
            recordId,
            fieldId,
        };

        if (!isSafeNumber(recordId)) {
            return;
        }

        await CoreNavigator.navigateToSitePath(
           `${ADDON_DATAFIELD_CONSENT_PAGE_NAME}/${courseId}/${cmId}/consent/${recordId}`,
            { siteId: notification.site, params: pageParams },
        );
    }

}

export const AddonModDataFieldConsentPushClickHandler = makeSingleton(AddonModDataFieldConsentPushClickHandlerService);

type NotificationData = CorePushNotificationsNotificationBasicData & {
    courseid: number;
    fieldid: number;
    recordid: number;
    contexturl: string;
};
