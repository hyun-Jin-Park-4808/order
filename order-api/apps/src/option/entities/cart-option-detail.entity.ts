import { CoreEntity } from "@app/common/entities/common/core.entity";
import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { OptionDetail } from "./option-detail.entity";
import { OptionItem } from "./option-item.entity";

@Entity('cart-option-details')
export class CartOptionDetail extends CoreEntity {
    @ManyToOne((type) => OptionItem, (optionItem) => optionItem.cartOptionDetails)
    @JoinColumn()
    optionItem: OptionItem;

    @ManyToOne((type) => OptionDetail, 
    (optionDetail) => optionDetail.cartOptionDetails)
    @JoinColumn()
    optionDetail: OptionDetail;
}