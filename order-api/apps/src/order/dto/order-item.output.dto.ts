import { CoreOutput } from "@app/common/dto/common/output.dto";
import { OrderItem } from "../entities/order-item.entity";

export class OrderItemsOutput extends CoreOutput {
    data?: OrderItem[];
}