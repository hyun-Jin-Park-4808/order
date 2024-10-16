import { IsArray, ArrayNotEmpty, IsNumber } from "class-validator";

export class CartItemsInput {
    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true })
    itemIds: number[];
}