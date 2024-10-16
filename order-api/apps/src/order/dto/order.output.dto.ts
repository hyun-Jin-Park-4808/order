import { CoreOutput } from "@app/common/dto/common/output.dto";
import { Order } from "../entities/order.entity";

export class OrderOutput extends CoreOutput {
    data?: Order;
}

export class OrdersOutput extends CoreOutput {
    data?: Order[];
}