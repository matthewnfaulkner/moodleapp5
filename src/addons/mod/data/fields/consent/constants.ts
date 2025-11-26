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

import { CORE_COURSE_MODULE_FEATURE_PREFIX } from '@features/course/constants';

export const ADDON_DATAFIELD_CONSENT_COMPONENT = 'AddonDatafieldConsent';
export const ADDON_DATAFIELD_CONSENT_PAGE_NAME = 'datafield_consent';
export const ADDON_DATAFIELD_CONSENT_NAME = 'consent';

export const ADDON_DATAFIELD_CONSENT_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_DATAFIELD_CONSENT_COMPONENT;

// Events.
export const ADDON_DATAFIELD_CONSENT_CONSENT_SUBMITTED = 'addon_datafield_consent_consent_submitted';

export enum DatafieldConsentfields{
    user = 0,
    consent = 1,
    signature = 2
}
