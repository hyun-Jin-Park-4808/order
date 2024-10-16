import { IsNumber } from "class-validator";

export class PaymentAmount {
    @IsNumber()
    total: number;

    @IsNumber()
    taxFree: number;

    @IsNumber()
    vat: number;

    @IsNumber()
    supply: number;

    @IsNumber()
    discount: number;

    @IsNumber()
    paid: number;

    @IsNumber()
    cancelled: number;

    @IsNumber()
    cancelledTaxFree: number;
}