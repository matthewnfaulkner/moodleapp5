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

import { Component, OnInit, HostBinding } from '@angular/core';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockBaseComponent } from '@features/block/classes/base-block-component';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonBlockFrontpageListItemComponent } from '../frontpage-list-item/frontpage-list-item';
import Ajv from 'ajv';

/**
 * Component to render a blog menu block.
 */
@Component({
    selector: 'addon-block-frontpage',
    templateUrl: 'addon-block-frontpage.html',
    styleUrls: ['frontpage.scss'],
    imports: [
        CoreSharedModule, AddonBlockFrontpageListItemComponent,
    ],
})
export class AddonBlockFrontpageComponent extends CoreBlockBaseComponent implements OnInit {

    blocks: CoreCourseBlock[] = [];

    courseId?: number;

    parsedBlockContent: AddonBlockFrontpageContent = {
        sectiontitle: '',
        sectionmore: '',
        sectionurl: '',
        blockpriority: 0,
        blockmobileenabled: false,
        blockitems: [],
    };

    blockContentLog: Record<number, AddonBlockFrontpageContentItemCourse> = {};

    @HostBinding('attr.id') id?: string;

    blockContent?: AddonBlockFrontpageContent;
    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {

        this.courseId = this.contextLevel == 'course' ? this.instanceId : undefined;

        this.fetchContentDefaultError = 'Error getting ' + this.block.contents?.title + ' data.';

        this.id = `block-${this.block.instanceid}`;

        this.parsedBlockContent = JSON.parse(this.block.contents? this.block.contents.content : '' );

        const ajv = new Ajv();

        const validate = ajv.compile(addonBlockFrontpageContentSchema);

        const contents = JSON.parse(this.block.contents? this.block.contents.content : '' );

        const isvalid = validate(contents);

        if (isvalid) {
            this.parsedBlockContent = contents as AddonBlockFrontpageContent;
        }

        this.loadContent();
    }

}

const addonBlockFrontpageContentItemCourseSchema: Record<string, unknown> = {
    type: 'object',
    properties: {
        itemid: { type: ['number', 'string'] },
        itemtitle: { type: 'string' },
        itemcat: { type: 'string' },
        itemdescription: { type: 'string' },
        itemsummary: { type: 'string' },
        itemroot: { type: 'string' },
        itemrootid: { type: ['number', 'string'] },
        itemurl: { type: 'string' },
        itemcaturl: { type: 'string' },
        itemrooturl: { type: 'string' },
        itemimg: { type: ['string', 'null'] },
        itemtag: { type: 'string' },
        itemtagurl: { type: 'string' },
        itemindex: { type: 'number' },
        first: { type: ['boolean', 'null'] },
        forum: { type: ['boolean', 'null'] },
        count: { type: ['number', 'null'] },
        itemstartdate: { type: ['number', 'string'] },
        itemenddate: { type: ['number', 'string'] },
        itemthumbnail: { type: ['string', 'null'] },
    },
    additionalProperties: false,
};

const addonBlockFrontpageItemSchema: Record<string, unknown> = {
    type: 'object',
    properties: {
        courses: {
            type: ['object', 'array'],
            patternProperties: {
                '^[0-9]+$': addonBlockFrontpageContentItemCourseSchema,
            },
        },
        course: addonBlockFrontpageContentItemCourseSchema,
        title: {
            type: ['string', 'null'],
        },
        thumbnailurl: {
            type: ['string', 'null'],
        },
        jumboimgurl: {
            type : ['string', 'null'],
        },
        tags: {
            type: ['array', 'null'],
            items: {
                type :'string',
            },
        },
        external: {
            type: ['boolean', 'null'],
        },
        criteria: {
            type: ['number', 'string'],
        },
        category: {
            type: ['number', 'string', 'null', 'array'],
        },
        startDate: {
            type: ['number', 'string'],
        },
        endDate: {
            type: ['number', 'string'],
        },
        id: {
            type: ['number', 'string', 'null'],
        },
    },
};

const addonBlockFrontpageContentSchema = {
    type: 'object',
    properties: {
        sectiontitle: { type: 'string' },
        sectionmore: { type: 'string' },
        sectionurl: { type: 'string' },
        blockitems: {
            type: 'array',
            items: addonBlockFrontpageItemSchema,
        },
    },
};

export interface AddonBlockFrontpageContent {
    sectiontitle: string;
    sectionmore: string;
    sectionurl: string;
    blockpriority: number;
    blockmobileenabled: boolean;
    blockitems: AddonBlockFrontpageContentItem[];
};

export type AddonBlockFrontpageContentItem = {
    courses?:  { [key: number]: AddonBlockFrontpageContentItemCourse };
    course:  AddonBlockFrontpageContentItemCourse;
    title?: string;
    thumbnailurl?: string;
    jumboimgurl?: string;
    tags?: string[];
    external?: boolean;
    criteria?: number;
    category?: number;
    startdate?: number;
    enddate?: number;
    id?: number;
};

export type AddonBlockFrontpageContentItemCourse = {
    itemid: number;
    itemtitle?: string;
    itemcat?: string;
    itemdescription?: string;
    itemsummary?: string;
    itemroot?: string;
    itemrootid?: number;
    itemurl?: string;
    itemcaturl?: string;
    itemrooturl?: string;
    itemimg?: string;
    itemtag?: string;
    itemtagurl?: string;
    itemindex?: number;
    first?: boolean;
    forum?: boolean;
    count?: number;
    itemstartdate?: number;
    itemenddate?: number;
    itemthumbnail?: string;
};

export type AddonBlockFrontpageConfig = {
    enablemobile: boolean;
    priority: number;
    instanceid: number;
};
