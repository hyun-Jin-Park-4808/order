import { CoreOutput } from "@app/common/dto/common/output.dto";
import { DeliveryMemo } from "../enitities/delivery-memo.entity";

export class DeliveryMemoOutput extends CoreOutput {
    data?: DeliveryMemo;
}

export class DeliveryMemosOutput extends CoreOutput {
    data?: DeliveryMemo[];
}