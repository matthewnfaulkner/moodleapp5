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

import { DownloadStatus } from '@/core/constants';
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, inject  } from '@angular/core';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreCourseDownloadStatusHelperService, CoreEventCourseStatusChanged }
from '@features/course/services/course-download-status-helper';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonBlockFrontpageContentItemCourse, AddonBlockFrontpageContentItem } from '../frontpage/frontpage';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { COURSE_STATUS_CHANGED_EVENT,  CORE_COURSE_ALL_COURSES_CLEARED } from '@features/course/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * This directive is meant to display an item for a list of courses.
 *
 * Example usage:
 *
 * <core-courses-course-list-item [course]="course"></core-courses-course-list-item>
 */
@Component({
    selector: 'addon-block-frontpage-list-item',
    templateUrl: 'addon-block-frontpage-list-item.html',
    styleUrls: ['frontpage-list-item.scss'],
    imports: [
            CoreSharedModule,
        ],
})
export class AddonBlockFrontpageListItemComponent implements OnInit, OnDestroy, OnChanges {

    @Input() blockItem!: AddonBlockFrontpageContentItem; // The course to render.
    @Input() showDownload = false; // If true, will show download button.
    @Input() layout: 'listwithenrol'|'summarycard'|'list'|'card' = 'listwithenrol';
    @Input() blockContentLog!: Record<number, AddonBlockFrontpageContentItemCourse>;
    course: AddonBlockFrontpageContentItemCourse = {
        itemid: 0,
    };

    enrolmentIcons: CoreCoursesEnrolmentIcons[] = [];
    isEnrolled = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
        loading: true,
    };

    showSpinner = false;
    courseOptionMenuEnabled = false;
    progress = -1;
    completionUserTracked: boolean | undefined = false;
    visible = false;

    protected courseStatus: DownloadStatus = DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED;
    protected isDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;

    protected element: HTMLElement;

     constructor() {
        this.element = inject(ElementRef).nativeElement;

    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {

        if (!(this.blockItem.course.itemid in this.blockContentLog)){
            this.course = this.blockItem.course;

            return;
        }
        if (this.blockItem.courses === undefined || Object.keys(this.blockItem.courses).length == 0) {
            this.course = this.blockItem.course;
        }
        else{
            for (const key in this.blockItem.courses) {
                // object[prop]
                if(!(key in this.blockContentLog)){
                    this.course = this.blockItem.courses[key];
                    this.blockContentLog[key] = this.course;
                    break;
                }
            }
        }

        return;
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.initPrefetchCourse();
    }

    /**
     * Open a course.
     */
    async openCourse(): Promise<void> {
        if (this.course.itemurl) {
            const canHandleLink = await CoreContentLinksHelper.canHandleLink(this.course.itemurl);

            if (canHandleLink){
                CoreContentLinksHelper.handleLink(this.course.itemurl);
            }
        }
        else{
            CoreCourseHelper.openCourse({ id: this.course.itemid }, { params: { isGuest: false } });
        }
    }

    /**
     * Initialize prefetch course.
     *
     * @param forceInit Force initialization of prefetch course info.
     */
    async initPrefetchCourse(forceInit = false): Promise<void> {
        if (!this.isEnrolled || !this.showDownload ||
            (this.courseOptionMenuEnabled && !forceInit)) {
            return;
        }

        if (this.courseStatusObserver !== undefined) {
            // Already initialized.
            return;
        }

        // Listen for status change in course.
        this.courseStatusObserver = CoreEvents.on(COURSE_STATUS_CHANGED_EVENT, (data: CoreEventCourseStatusChanged ) => {
            if (data.courseId ==  this.course.itemid || data.courseId == CORE_COURSE_ALL_COURSES_CLEARED) {
                this.updateCourseStatus(data.status);
            }
        }, CoreSites.getCurrentSiteId());

        // Determine course prefetch icon.
        const downloadStatusHelper = new CoreCourseDownloadStatusHelperService();
        const status = await downloadStatusHelper.getCourseStatus(this.course.itemid);

        this.updateCourseStatus(status);

        if (this.prefetchCourseData.loading) {
            // Course is being downloaded. Get the download promise.
            const promise = CoreCourseHelper.getCourseDownloadPromise(this.course.itemid);
            if (promise) {
                // There is a download promise. If it fails, show an error.
                promise.catch((error) => {
                    if (!this.isDestroyed) {
                        CoreAlerts.showError(error);
                    }
                });
            } else {
                // No download, this probably means that the app was closed while downloading. Set previous status.
                downloadStatusHelper.setCoursePreviousStatus(this.course.itemid);
            }
        }

    }

    /**
     * Update the course status icon and title.
     */
    toggleCollapse(): void {
        this.visible = !this.visible;
    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: DownloadStatus): void {
        const statusData = CoreCourseHelper.getCoursePrefetchStatusInfo(status);

        this.courseStatus = status;
        this.prefetchCourseData.status = statusData.status;
        this.prefetchCourseData.icon = statusData.icon;
        this.prefetchCourseData.statusTranslatable = statusData.statusTranslatable;
        this.prefetchCourseData.loading = statusData.loading;
        this.prefetchCourseData.downloadSucceeded = status === DownloadStatus.DOWNLOADED;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.courseStatusObserver?.off();
    }

}

/**
 * Enrolment icons to show on the list with a label.
 */
export type CoreCoursesEnrolmentIcons = {
    label: string;
    icon: string;
};
