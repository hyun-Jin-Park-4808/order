import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { PayMethod } from "../entities/payment.entity";

export class PaymentInput {
    @IsString()
    paymentId: string;

    @IsNumber()
    orderId: number;

    @IsEnum(PayMethod)
    payMethod: PayMethod;

    @IsNumber()
    deliveryId: number;

    @IsNumber()
    deliveryMemoId: number;

    @IsNumber()
    @IsOptional()
    pointAmount: number;

    @IsNumber()
    @IsOptional()
    couponAmount: number;
}