import { OrderItem } from "../../order/entities/order-item.entity";
import { IsNumber } from "class-validator";

export class OrderItemInput {
    @IsNumber()
    productId: number;

    @IsNumber()
    quantity: number;

    constructor(item: OrderItem) {
        this.productId = item.product.id;
        this.quantity = item.quantity;
    }
}

export class ItemsInput {
    itemsInput: OrderItemInput[];
  }