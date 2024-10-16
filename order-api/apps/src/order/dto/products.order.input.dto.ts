
import { OptionItemInput } from "../../product/dto/option.item.input.dto";
import { IsNumber, IsOptional } from "class-validator";

export class ProductsOrderInput {
    @IsNumber()
    totalAmount: number;

    @IsNumber()
    productId: number;
    
    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsOptional()
    optionItemInputs?: OptionItemInput[];
}