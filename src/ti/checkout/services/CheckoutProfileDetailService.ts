/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckoutProfileApiResponse } from '../models/CheckoutProfileApiResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CheckoutProfileDetailService {
    /**
     * Retrieves the details for a specific Checkout Profile.
     * @returns CheckoutProfileApiResponse OK
     * @throws ApiError
     */
    public static checkoutProfileDetails({
        checkoutProfileId,
    }: {
        /**
         * Customer's checkout profile Id. Available in your myTI customer portal or from the checkout Profile List API.
         */
        checkoutProfileId: string,
    }): CancelablePromise<CheckoutProfileApiResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/checkoutprofiles/{checkoutProfileId}',
            path: {
                'checkoutProfileId': checkoutProfileId,
            },
            errors: {
                400: `400 Bad Request`,
                401: `401 Not authorized. OAuth credentials were missing or invalid`,
                404: `404 Not Found`,
                405: `405 Method Not Allowed`,
                429: `429 Too Many Requests`,
                500: `500 Internal Server Error`,
            },
        });
    }
}
