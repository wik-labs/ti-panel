/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Product } from './Product';
/**
 * Pageable Product list response
 */
export type ProductPage = {
    /**
     * The list of products in the requested page
     */
    content?: Array<Product>;
    /**
     * Indicates if the returned page is the first page of the matching result set
     */
    first?: boolean;
    /**
     * Indicates if the returned page is the last page of the matching result set
     */
    last?: boolean;
    /**
     * The page number that is returned. This value will match the Page request parameter specified in the request.
     */
    number?: number;
    /**
     * The number of elements in the current page
     */
    numberOfElements?: number;
    /**
     * The size of the page. This value will match the Size request parameter specified in the request.
     */
    size?: number;
    /**
     * The total number of products in the result set (not limited to the current page)
     */
    totalElements?: number;
    /**
     * The total number of pages in the result set based on the specified page size
     */
    totalPages?: number;
};

