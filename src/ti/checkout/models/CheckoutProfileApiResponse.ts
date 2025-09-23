/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddressResponse } from './AddressResponse';
import type { FreightAssocResponse } from './FreightAssocResponse';
import type { PaymentMethodResponse } from './PaymentMethodResponse';
import type { TaxResponse } from './TaxResponse';
export type CheckoutProfileApiResponse = {
    checkoutProfileId?: string;
    /**
     * Name of the admin of the company account
     */
    adminName?: string;
    /**
     * Email address of the admin of the company account
     */
    adminEmail?: string;
    /**
     * Name of the checkout profile.
     */
    checkoutProfileName?: string;
    shipping?: AddressResponse;
    billing?: AddressResponse;
    /**
     * Email address of the person who created the checkout profile.
     */
    createdBy?: string;
    /**
     * Email address of the person who last modifed the checkout profile.
     */
    modifiedBy?: string;
    /**
     * The name of the application where the materials in the order will be used.
     */
    applicationName?: string;
    /**
     * The name of the end equipment where the materials in the order will be used.
     */
    endEquipmentName?: string;
    /**
     * Boolean flag of true or false as to whether the materials in the order will be used for any military end use.
     */
    isMilitary?: boolean;
    isBusiness?: boolean;
    isTaxExempt?: boolean;
    profileCurrencyCode?: string;
    profileRegionCode?: string;
    importerOfRecord?: string;
    incoterm?: string;
    useFreeTiShipping?: boolean;
    isCoCPrintRequired?: boolean;
    taxes?: Array<TaxResponse>;
    tiShippingServiceLevel?: string;
    tiShippingAgreementAcceptedBy?: string;
    /**
     * The timestamp on which the TI shipping agreement was accepted , in the format YYYY-MM-DD'T'HH24:mm:ss+ZZZZ
     */
    tiShippingAgreementAcceptedDate?: string;
    freightAssocs?: Array<FreightAssocResponse>;
    paymentMethod?: PaymentMethodResponse;
};

