import { IsEnum, IsNumber, IsString } from "class-validator";
import { PayMethod } from "../entities/payment.entity";

export class PaymentRequest {
    @IsString()
    storeId: string;

    @IsString()
    channelKey: string;

    @IsString()
    paymentId: string;

    @IsString()
    orderName: string;

    @IsNumber()
    totalAmount: number;

    @IsEnum(PayMethod)
    paymentType: PayMethod;

    @IsString()
    currency: string;
}