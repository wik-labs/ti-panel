/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { orderCreate } from '../models/orderCreate';
import type { orderCreateResponse } from '../models/orderCreateResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TiStoreTestOrderService {
    /**
     * Create a TI store test order.
     * @returns orderCreateResponse Order created.
     * @throws ApiError
     */
    public static postStoreOrdersTest({
        requestBody,
    }: {
        /**
         * TI store Test Order Create Request
         */
        requestBody: orderCreate,
    }): CancelablePromise<orderCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/store/orders/test',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `400 Bad request`,
                401: `Not authorized. OAuth credentials were missing or invalid.`,
                404: `Resource not found.`,
                405: `Method Not Allowed.`,
                422: `Unprocessable Entity`,
                429: `Too Many Requests.`,
                500: `System error.  The response should contain error details, including Execution ID, with which TI API support team can investigate.`,
            },
        });
    }
}
