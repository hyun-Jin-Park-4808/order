import { CoreOutput } from "@app/common/dto/common/output.dto";
import { Delivery } from "../entities/delivery.entity";

export class DeliveryOutput extends CoreOutput {
    data?: Delivery;
}

export class DeliveriesOutput extends CoreOutput {
    data?: Delivery[];
}