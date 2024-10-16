import { ArrayNotEmpty, IsArray, IsNumber } from "class-validator";

export class CartItemsOrderInput {
    @IsNumber()
    shippingFee: number;

    @IsNumber()
    totalAmount: number;
    
    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true })
    itemIds: number[];
}