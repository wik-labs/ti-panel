/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Product } from '../models/Product';
import type { ProductCatalog } from '../models/ProductCatalog';
import type { ProductPage } from '../models/ProductPage';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProductInventoryService {
    /**
     * Get information for a specific product by its OPN (Orderable Part Number)
     * @param tiPartNumber A URL encoded unique identifier for the product (Orderable Part Number).
     * Note: Part numbers that include /NOPB must be encoded prior to making the API call or the response will be a “not found” error. For example, LP2982AIM5-3.3/NOPB must be encoded as LP2982AIM5-3.3%2FNOPB. Make sure the encoding process does not have linefeed or new line breaks, such as LP2989IM-2.5%2FNOPB%0A%0A as this too will result in a product “not found” error.
     * @param currency Specific currency for pricing information. Specify the currency using ISO 4217 alphabetic codes. If not specified, pricing in USD will be provided.
     * @param excludeEvms Flag to exclude EVM (Evaluation Module) products from the result.  If not specified, EVMs are included.
     * @returns Product OK
     * @throws ApiError
     */
    public static getProductInformation(
        tiPartNumber: string,
        currency: string = 'USD',
        excludeEvms: boolean = false,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/products/{tiPartNumber}',
            path: {
                'tiPartNumber': tiPartNumber,
            },
            query: {
                'currency': currency,
                'exclude-evms': excludeEvms,
            },
            errors: {
                400: `422 Unprocessable Entity`,
                401: `401 Unauthorized`,
                403: `403 Forbidden`,
                404: `404 Not Found`,
                405: `405 Method Not Allowed`,
                429: `429 Too Many Requests`,
                500: `500 Internal Server Error`,
            },
        });
    }
    /**
     * Get pageable list of TI store products
     * @param gpn Generic part number of one or more child products (also referred to as the base part number).
     * @param currency Specific currency for pricing information. Specify the currency using ISO 4217 alphabetic codes. If not specified, pricing in USD will be provided.
     * @param excludeEvms Flag to exclude EVM (Evaluation Module) products from the result.  If not specified, EVMs are included.
     * @param page The index of the page (starting at 0) to be returned from this request
     * @param size The page size between 1 and 100 to be returned
     * @returns ProductPage OK
     * @throws ApiError
     */
    public static getProductList(
        gpn: string,
        currency: string = 'USD',
        excludeEvms: boolean = false,
        page: number,
        size: number = 20,
    ): CancelablePromise<ProductPage> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/products',
            query: {
                'gpn': gpn,
                'currency': currency,
                'exclude-evms': excludeEvms,
                'page': page,
                'size': size,
            },
            errors: {
                400: `422 Unprocessable Entity`,
                401: `401 Unauthorized`,
                403: `403 Forbidden`,
                404: `404 Not Found`,
                405: `405 Method Not Allowed`,
                429: `429 Too Many Requests`,
                500: `500 Internal Server Error`,
            },
        });
    }
    /**
     * Retrieve the full catalog of parts available to purchase from the TI store.
     * @param currency Specific currency for pricing information. Specify the currency using ISO 4217 alphabetic codes. If not specified, pricing in USD will be provided.
     * @param excludeEvms Flag to exclude EVM (Evaluation Module) products from the result.  If not specified, EVMs are included.
     * @returns ProductCatalog OK
     * @throws ApiError
     */
    public static getProductCatalog(
        currency: string = 'USD',
        excludeEvms: boolean = false,
    ): CancelablePromise<ProductCatalog> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/store/products/catalog',
            query: {
                'currency': currency,
                'exclude-evms': excludeEvms,
            },
            errors: {
                400: `422 Unprocessable Entity`,
                401: `401 Unauthorized`,
                403: `403 Forbidden`,
                404: `404 Not Found`,
                405: `405 Method Not Allowed`,
                429: `429 Too Many Requests`,
                500: `500 Internal Server Error`,
            },
        });
    }
}
