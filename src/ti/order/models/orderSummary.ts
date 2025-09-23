/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type orderSummary = {
    /**
     * The order number
     */
    orderNumber?: string;
    /**
     * The date the order was made
     */
    orderDate?: string;
    /**
     * Currency fields
     */
    currencyCode?: string;
    /**
     * The channel through which this order was created. Possible values are API, EDI, TI.com, RPA.
     */
    orderEntry?: string;
    /**
     * Customer's purchase order number - usually the PONumber without 1 and 0's
     */
    customerPurchaseOrderNumber?: string;
    /**
     * Customer's order's status
     */
    orderStatus?: string;
    /**
     * The customer who placed the order
     */
    orderedBy?: string;
    /**
     * Is this intended for production?
     */
    isProductionOrder?: boolean;
    totalOrderSummary?: {
        /**
         * Subtotal for the order.
         */
        subTotal?: number;
        /**
         * The amount of the discounts if applicable that were applied to this order.
         */
        estimatedDiscountAmount?: number;
        /**
         * The total shipping cost that was calculated for this order.
         */
        estimatedShippingCost?: number;
        /**
         * Additional inventory transfer fee (if applicable) to accommodate your order to ship from a United States location
         */
        estimatedInventoryTransferFee?: number;
        /**
         * The total estimated taxes that was calculated for this order.
         */
        estimatedTaxes?: number;
        /**
         * Total cost of the order after including the taxes, shipping costs and deducting any discounts or coupons.
         */
        orderTotal?: number;
    };
    shippingAddress?: {
        /**
         * First name of the address.
         */
        firstName?: string;
        /**
         * Last name of the address.
         */
        lastName?: string;
        /**
         * Company name mentioned in the address.
         */
        company?: string;
        /**
         * Address line 1 of the address.
         */
        addressLine1?: string;
        /**
         * Address line 1 of the address.
         */
        addressLine2?: string;
        /**
         * Town or city of the address.
         */
        city?: string;
        /**
         * State or region of the address.
         */
        stateRegion?: string;
        /**
         * Postal code of the address.
         */
        postalCode?: string;
        /**
         * Two character ISO code of the country.
         */
        regionCode?: string;
        /**
         * Country name of the address.
         */
        region?: string;
        /**
         * Email address for the address.
         */
        email?: string;
        /**
         * Phone number for the address.
         */
        phoneNumber?: string;
        /**
         * URL specified for the address.
         */
        companyURL?: string;
    };
    payment?: {
        /**
         * Indicates the payment type used. This could be "TI Line of Credit" or "3rd Party Line of Credit" or 'Bank Transfer'.
         */
        type?: string;
        /**
         * Indicates the payment method used. For example with '3rd Party Line of Credit' this would be 'Apruve'.
         */
        method?: string;
        /**
         * This is used for bank transfer payment where an admin email is required for order approval.This information was provided in the check profile ID setup.
         */
        bankTranferApproverEmail?: string;
    };
    numberOfLineItems?: number;
    hasOrderAdjustments?: boolean;
};

