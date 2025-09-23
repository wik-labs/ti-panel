/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { deliveryCostDetails } from '../models/deliveryCostDetails';
import type { orderCreate } from '../models/orderCreate';
import type { orderCreateResponse } from '../models/orderCreateResponse';
import type { orderSummary } from '../models/orderSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TiStoreProductionOrderService {
    /**
     * Create a TI store production order.
     * @returns orderCreateResponse Order created.
     * @throws ApiError
     */
    public static postStoreOrders({
        requestBody,
    }: {
        /**
         * TI store order create request
         */
        requestBody: orderCreate,
    }): CancelablePromise<orderCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/store/orders',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Not authorized. OAuth credentials were missing or invalid.`,
                404: `Resource not found.`,
                405: `Method Not Allowed.`,
                422: `Unprocessable Entity`,
                429: `Too Many Requests.`,
                500: `System error.  The response should contain error details, including Execution ID, with which TI API support team can investigate.`,
            },
        });
    }
    /**
     * Retrieves order history for a specific data range.
     * @returns orderSummary Order list retrieved.
     * @throws ApiError
     */
    public static getOrderHistory({
        startDate,
        endDate,
    }: {
        /**
         * Start of date range for which to get order history. Limit to 1 year, or 10k records, whichever is less. Defaults to 30 days ago.
         */
        startDate?: string,
        /**
         * End of date range for which to get order history. Limit to 1 year, or 10k records, whichever is less. Defaults to today.
         */
        endDate?: string,
    }): CancelablePromise<Array<orderSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/orders',
            query: {
                'startDate': startDate,
                'endDate': endDate,
            },
            errors: {
                400: `400 Bad request`,
                401: `401 API Token invalid`,
                404: `404 API Endpoint not found`,
                429: `429 Quota Limit Hit`,
                503: `503 System error.  The response should contain error details, including Execution ID, with which TI API support team can investigate.`,
            },
        });
    }
    /**
     * Details for a specific order
     * @returns orderSummary Order details retrieved.
     * @throws ApiError
     */
    public static getStoreOrders({
        orderNumber,
    }: {
        orderNumber: string,
    }): CancelablePromise<Array<orderSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/orders/{orderNumber}',
            path: {
                'orderNumber': orderNumber,
            },
            errors: {
                401: `Not authorized. OAuth credentials were missing or invalid.`,
                404: `Resource not found.`,
                405: `Method Not Allowed.`,
                429: `Too Many Requests.`,
                500: `System error.  The response should contain error details, including Execution ID, with which TI API support team can investigate.`,
            },
        });
    }
    /**
     * Get estimated delivery costs.
     * @returns deliveryCostDetails Get delivery costs.
     * @throws ApiError
     */
    public static getStoreOrdersDeliveryCost({
        regionCode,
        currencyCode,
        quantity,
    }: {
        /**
         * Denotes the 2 character alphabet - ISO code. Example : US
         */
        regionCode: string,
        /**
         * Denotes the 3 character alphabet ISO currency code. Example : USD
         */
        currencyCode: string,
        /**
         * Denotes the quantity. This should be a number greater than zero
         */
        quantity: number,
    }): CancelablePromise<deliveryCostDetails> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/orders/deliveryCost',
            query: {
                'regionCode': regionCode,
                'currencyCode': currencyCode,
                'quantity': quantity,
            },
            errors: {
                401: `Not authorized. OAuth credentials were missing or invalid.`,
                404: `Resource not found.`,
                405: `Method Not Allowed.`,
                429: `Too Many Requests.`,
                500: `System error.  The response should contain error details, including Execution ID, with which TI API support team can investigate.`,
            },
        });
    }
}
