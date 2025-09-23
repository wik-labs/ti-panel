/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckoutProfileListSummary } from '../models/CheckoutProfileListSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CheckoutProfileListService {
    /**
     * Retrieves a  summary list of Checkout Profiles which can be used in the TI Order create API.
     * @returns CheckoutProfileListSummary OK
     * @throws ApiError
     */
    public static checkoutProfilesSummary(): CancelablePromise<CheckoutProfileListSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/checkoutprofiles',
            errors: {
                401: `401 Not authorized. OAuth credentials were missing or invalid`,
                405: `405 Method Not Allowed`,
                429: `429 Too Many Requests`,
                500: `500 Internal Server Error`,
            },
        });
    }
}
