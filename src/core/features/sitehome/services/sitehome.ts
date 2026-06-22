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

import { CoreSites, CoreSitesCommonWSOptions  } from '@services/sites';
import { CoreSite  } from '@classes/sites/site';
import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreCourse, CoreCourseBlock } from '../../course/services/course';
import { CoreCourses } from '../../courses/services/courses';
import { AddonModForumData } from '@addons/mod/forum/services/forum';
import { CoreError } from '@classes/errors/error';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { asyncObservable } from '@/core/utils/rxjs';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreCacheUpdateFrequency } from '@/core/constants';

import { AddonBlockFrontpageConfig } from '@addons/block/frontpage/components/frontpage/frontpage';

/**
 * Items with index 1 and 3 were removed on 2.5 and not being supported in the app.
 */
export enum FrontPageItemNames {
    NEWS_ITEMS = 0,
    LIST_OF_CATEGORIES = 2,
    COMBO_LIST = 4,
    ENROLLED_COURSES = 5,
    LIST_OF_COURSE = 6,
    COURSE_SEARCH_BOX = 7,
}

const ROOT_CACHE_KEY = 'CoreSiteHome:';

/**
 * Service that provides some features regarding site home.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteHomeProvider {

    static readonly SITE_HOME_DEFAULT = '__default';
    /**
     * Get cache key for dashboard blocks WS calls.
     *
     * @param myPage What my page to return blocks of. Default MY_PAGE_DEFAULT.
     * @param userId User ID. Default, 0 means current user.
     * @returns Cache key.
     */
    protected getSiteHomeBlocksCacheKey(myPage = CoreSiteHomeProvider.SITE_HOME_DEFAULT, userId: number = 0): string {
        return ROOT_CACHE_KEY + 'blocks:' + myPage + ':' + userId;
    }

    /**
     * Get cache key for dashboard blocks WS calls.
     *
     * @param myPage What my page to return blocks of. Default MY_PAGE_DEFAULT.
     * @param userId User ID. Default, 0 means current user.
     * @returns Cache key.
     */
    protected getSiteHomeJumboConfigCacheKey(myPage = CoreSiteHomeProvider.SITE_HOME_DEFAULT, userId: number = 0): string {
        return ROOT_CACHE_KEY + 'jumbo:' + myPage + ':' + userId;
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param myPage What my page to return blocks of. Default MY_PAGE_DEFAULT.
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of blocks.
     * @since 3.6
     */
    getSiteHomeBlocksFromWS(
        userId?: number,
        siteId?: string,
    ): Promise<CoreCourseBlock[]> {
        return firstValueFrom(this.getSiteHomeBlocksFromWSObservable({
            userId,
            siteId,
        }));
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param options Options.
     * @returns Observable that returns the list of blocks.
     * @since 3.6
     */
    getSiteHomeBlocksFromWSObservable(options: GetSiteHomeBlocksOptions = {}): WSObservable<CoreCourseBlock[]> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const myPage = options.myPage ?? CoreSiteHomeProvider.SITE_HOME_DEFAULT;
            const params: CoreBlockGetSiteHomeBlocksWSParams = {
                courseid: 1,
                returncontents: true,

            };

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getSiteHomeBlocksCacheKey(myPage, options.userId),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const observable = site.readObservable<CoreBlockGetSiteHomeBlocksWSResponse>(
                'core_block_get_course_blocks',
                params,
                preSets,
            );

            return observable.pipe(map(result => {
                if (site.isVersionGreaterEqualThan('4.0')) {
                    // Temporary hack to have course overview on 3.9.5 but not on 4.0 onwards.
                    // To be removed in a near future.
                    // Remove myoverview when is forced. See MDL-72092.
                    result.blocks = result.blocks.filter((block) =>
                        block.instanceid != 0 || block.name != 'myoverview' || block.region != 'forced');
                }

                return result.blocks || [];
            }));
        });
    }

    /**
     * Get dashboard blocks.
     *
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param myPage What my page to return blocks of. Default MY_PAGE_DEFAULT.
     * @returns Promise resolved with the list of blocks.
     */
    getSiteHomeBlocks(
        userId?: number,
        siteId?: string,
        myPage = CoreSiteHomeProvider.SITE_HOME_DEFAULT,
    ): Promise<CoreSiteHomeBlocks> {
        return firstValueFrom(this.getSiteHomeBlocksObservable({
            myPage,
            userId,
            siteId,
        }));
    }

    /**
     * Get dashboard blocks.
     *
     * @param options Options.
     * @returns observable that returns the list of blocks.
     */
    getSiteHomeBlocksObservable(options: GetSiteHomeBlocksOptions = {}): WSObservable<CoreSiteHomeBlocks> {
        return this.getSiteHomeBlocksFromWSObservable(options).pipe(map(blocks => {
            let mainBlocks: CoreCourseBlock[] = [];
            let sideBlocks: CoreCourseBlock[] = [];
            const frontpageConfigs: AddonBlockFrontpageConfig[] = [];
            const frontpageBlocks: Record<number, CoreCourseBlock> = {};
            blocks.forEach((block) => {
                if(block.name == 'frontpage'){
                    if(Array.isArray(block.configs)){
                        const frontpageConfig: AddonBlockFrontpageConfig = {
                            enablemobile: false,
                            priority: 10,
                            instanceid: block.instanceid,
                        };
                        block.configs.forEach((config) => {
                            frontpageConfig[config.name] = JSON.parse(config.value);
                        });
                        if(frontpageConfig.enablemobile){
                            frontpageConfigs.push(frontpageConfig);
                            frontpageBlocks[block.instanceid] = block;
                        }
                    }
                }
                else{
                    mainBlocks.push(block);
                }

            });

            frontpageConfigs.sort((a, b) => {
                if (a.priority < b.priority) {
                    return 1;
                }
                if (a.priority > b.priority) {
                    return -1;
                }

                return 0;
            });

            frontpageConfigs.forEach((config) => {
                mainBlocks.splice(0, 0, frontpageBlocks[config.instanceid]);
            });

            if (mainBlocks.length == 0) {
                mainBlocks = [];
                sideBlocks = [];

                blocks.forEach((block) => {
                    if (block.region.match('side')) {
                        sideBlocks.push(block);
                    } else {
                        mainBlocks.push(block);
                    }
                });
            }

            return { mainBlocks, sideBlocks };
        }));
    }

    /**
     * Get the news forum for the Site Home.
     *
     * @param siteHomeId Site Home ID.
     * @returns Promise resolved with the forum if found, rejected otherwise.
     */
    async getNewsForum(siteHomeId?: number): Promise<AddonModForumData> {
        if (!siteHomeId) {
            siteHomeId = CoreSites.getCurrentSiteHomeId();
        }

        const { AddonModForum } = await import('@addons/mod/forum/services/forum');

        const forums = await AddonModForum.getCourseForums(siteHomeId);
        const forum = forums.find((forum) => forum.type == 'news');

        if (forum) {
            return forum;
        }

        throw new CoreError('No news forum found');
    }

    /**
     * Invalidate the WS call to get the news forum for the Site Home.
     *
     * @param siteHomeId Site Home ID.
     */
    async invalidateNewsForum(siteHomeId: number): Promise<void> {
        const { AddonModForum } = await import('@addons/mod/forum/services/forum');

        await AddonModForum.invalidateForumData(siteHomeId);
    }

    /**
     * Returns whether or not the frontpage is available for the current site.
     *
     * @param siteId The site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's available.
     */
    async isAvailable(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            // First check if it's disabled.
            if (this.isDisabledInSite(site)) {
                return false;
            }

            // Use a WS call to check if there's content in the site home.
            const siteHomeId = site.getSiteHomeId();
            const preSets: CoreSiteWSPreSets = { emergencyCache: false };

            try {
                const sections = await CoreCourse.getSections(siteHomeId, false, true, preSets, site.id);

                if (!sections || !sections.length) {
                    throw Error('No sections found');
                }

                const hasContent = sections.some((section) => section.summary || section.contents.length);
                const hasCourseBlocks = await CoreBlockHelper.hasCourseBlocks(siteHomeId);

                if (hasContent || hasCourseBlocks) {
                    // There's a section with content.
                    return true;
                }
            } catch {
                // Ignore errors.
            }

            const config = site.getStoredConfig();
            if (config && config.frontpageloggedin) {
                const items = await this.getFrontPageItems(config.frontpageloggedin);

                // There are items to show.
                return items.length > 0;
            }
        } catch {
            // Ignore errors.
        }

        return false;
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDisabledInSite(site: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreSiteHome');
    }

    /**
     * Get the nams of the valid frontpage items.
     *
     * @param frontpageItemIds CSV string with indexes of site home components.
     * @returns Valid names for each item.
     */
    async getFrontPageItems(frontpageItemIds?: string): Promise<string[]> {
        if (!frontpageItemIds) {
            return [];
        }

        const items = frontpageItemIds.split(',');

        const filteredItems: string[] = [];

        for (const item of items) {
            let itemNumber = parseInt(item, 10);

            let add = false;
            switch (itemNumber) {
                case FrontPageItemNames['NEWS_ITEMS']:
                    // Get number of news items to show.
                    add = !!CoreSites.getCurrentSite()?.getStoredConfig('newsitems');
                    break;
                case FrontPageItemNames['COMBO_LIST']:
                    itemNumber = FrontPageItemNames['LIST_OF_CATEGORIES']; // Do not break here.
                case FrontPageItemNames['LIST_OF_CATEGORIES']:
                case FrontPageItemNames['LIST_OF_COURSE']:
                case FrontPageItemNames['ENROLLED_COURSES']:
                    add = true;
                    break;
                case FrontPageItemNames['COURSE_SEARCH_BOX']:
                    add = !CoreCourses.isSearchCoursesDisabledInSite();
                    break;
                default:
                    break;
            }

            // Do not add an item twice.
            if (add && filteredItems.indexOf(FrontPageItemNames[itemNumber]) < 0) {
                filteredItems.push(FrontPageItemNames[itemNumber]);
            }
        }

        return filteredItems;
    }

    /**
     * Get dashboard blocks.
     *
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param myPage What my page to return blocks of. Default MY_PAGE_DEFAULT.
     * @returns Promise resolved with the list of blocks.
     */
    getSiteHomeJumboConfig(
        userId?: number,
        siteId?: string,
        myPage = CoreSiteHomeProvider.SITE_HOME_DEFAULT,
    ): Promise<CoreSiteHomeJumboConfig> {
        return firstValueFrom(this.getSiteHomeJumboConfigObservable({
            myPage,
            userId,
            siteId,
        }));
    }

    /**
     * Get dashboard blocks.
     *
     * @param options Options.
     * @returns observable that returns the list of blocks.
     */
    getSiteHomeJumboConfigObservable(options: GetSiteHomeJumboConfigOptions = {}): WSObservable<CoreSiteHomeJumboConfig> {
        return this.getSiteHomeJumboConfigFromWSObservable(options).pipe(map(configs => configs));
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param options Options.
     * @returns Observable that returns the list of blocks.
     * @since 3.6
     */
    getSiteHomeJumboConfigFromWSObservable(options: GetSiteHomeJumboConfigOptions = {}): WSObservable<CoreSiteHomeJumboConfig> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const myPage = options.myPage ?? CoreSiteHomeProvider.SITE_HOME_DEFAULT;

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getSiteHomeJumboConfigCacheKey(myPage, options.userId),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const observable = site.readObservable<CoreSiteHomeJumboConfigWSResponse>(
                'theme_apoa_get_jumbo_config',
                null,
                preSets,
            );

            return observable.pipe(map(result => result.config));
        });
    }

}

export const CoreSiteHome = makeSingleton(CoreSiteHomeProvider);

export type CoreSiteHomeBlocks = {
    mainBlocks: CoreCourseBlock[];
    sideBlocks: CoreCourseBlock[];
};

/**
 * Options for some get dashboard blocks calls.
 */
export type GetSiteHomeBlocksOptions = CoreSitesCommonWSOptions & {
    userId?: number; // User ID. If not defined, current user.
    myPage?: string; // Page to get. If not defined, CoreCoursesDashboardProvider.MY_PAGE_DEFAULT.
};

/**
 * Params of core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetSiteHomeBlocksWSParams = {
    courseid: number; // The course id.
    returncontents?: boolean; // Whether to return the block contents.
};

/**
 * Data returned by core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetSiteHomeBlocksWSResponse = {
    blocks: CoreCourseBlock[]; // List of blocks in the course.
    warnings?: CoreStatusWithWarningsWSResponse[];
};

/**
 * Data returned by core_block_get_dashboard_blocks WS.
 */
type CoreSiteHomeJumboConfigWSResponse = {
    config: CoreSiteHomeJumboConfig; // List of blocks in the course.
    warnings?: CoreStatusWithWarningsWSResponse[];
};

export type CoreSiteHomeJumboSlide = {
    index: number;
    slidecontent: string; // Raw HTML content of the slide.
    slidelink?: string; // URL the slide links to.
};

export type CoreSiteHomeJumboConfig = {
    slides: CoreSiteHomeJumboSlide[];
    jumbostartdate?: number;
    jumboannouncement?: string; // First announcement text.
    announcementlink: string; // URL of the announcements forum.
    announcementid?: number;
};

/**
 * Options for some get dashboard blocks calls.
 */
export type GetSiteHomeJumboConfigOptions = CoreSitesCommonWSOptions & {
    userId?: number; // User ID. If not defined, current user.
    myPage?: string; // Page to get. If not defined, CoreCoursesDashboardProvider.MY_PAGE_DEFAULT.
};
