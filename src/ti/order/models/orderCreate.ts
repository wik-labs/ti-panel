/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type orderCreate = {
    order?: {
        /**
         * Customer's checkout profile Id. Available in your myTI customer portal. This is a mandatory field.
         */
        checkoutProfileId: string;
        /**
         * Customer's purchase order number if applicable. This is a optional field.
         */
        customerPurchaseOrderNumber?: string;
        /**
         * True or False flag to request expedite shipping for TI Shipping options. If true expedited shipping will be used when available. If false economy shipping will be used. Default is False.
         */
        expediteShipping?: boolean;
        /**
         * Customer's end customer company name where these materials will be used. This is an optional field.
         */
        endCustomerCompanyName?: string;
        customerOrderComments?: Array<{
            /**
             * Customer pass-through text. The text will be passed back in the response as is.
             */
            message?: string;
        }>;
        lineItems: Array<{
            /**
             * Line item number supplied by customer. This is a optional field.
             */
            customerLineItemNumber?: string;
            /**
             * TI orderable part number. This is a required field.
             */
            tiPartNumber: string;
            /**
             * Customer provided orderable part number. This is a optional field.
             */
            customerPartNumber?: string;
            /**
             * Boolean flag of true or false to request Custom Reel. Default is false.
             */
            customReelIndicator?: boolean;
            /**
             * Customer's requested quantity. This is a required field.
             */
            quantity: number;
            customerItemComments?: Array<{
                /**
                 * Customer pass-through text. The text will be passed back in the response as is.
                 */
                message?: string;
            }>;
        }>;
    };
};

