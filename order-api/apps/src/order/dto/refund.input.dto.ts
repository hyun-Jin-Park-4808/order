import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import { RefundShippingFeeType, ReversalType } from "../entities/order.entity";

export class RefundInput {
    @IsNumber()
    orderId: number;

    @IsOptional()
    orderItemIds?: number[];

    @IsEnum(ReversalType)
    @IsIn([ReversalType.APPLY_REFUND, ReversalType.APPLY_PARTIAL_REFUND]) 
    reversalType: ReversalType;

    @IsEnum(RefundShippingFeeType)
    refundShippingFeeType: RefundShippingFeeType;
    
    @IsString()
    reasonForRefund: string;
}