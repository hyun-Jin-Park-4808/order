import { OptionItemInput } from "../../product/dto/option.item.input.dto";
import { IsNumber, IsOptional } from "class-validator";

export class ModifyCartItemInput {
    @IsNumber()
    cartItemId: number;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @IsOptional()
    optionQuantity?: number;

    @IsNumber()
    @IsOptional()
    optionItemId?: number;

    @IsOptional()
    optionItemInputs?: OptionItemInput[];
}