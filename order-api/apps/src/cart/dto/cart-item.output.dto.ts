import { CoreOutput } from "@app/common/dto/common/output.dto";
import { CartItem } from "../entities/cart-item.entity";

export class CartItemOutput extends CoreOutput {
    data?: CartItem;
}

export class CartItemsOutput extends CoreOutput {
    data?: CartItem[];
}