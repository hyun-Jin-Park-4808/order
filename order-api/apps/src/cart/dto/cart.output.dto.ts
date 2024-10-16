import { CoreOutput } from "@app/common/dto/common/output.dto";
import { Cart } from "../entities/cart.entity";

export class CartOutput extends CoreOutput {
    data?: Cart;
}