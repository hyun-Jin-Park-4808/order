import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Member } from "../../member/entities/member.entity";

@Entity('delivery-memos')
export class DeliveryMemo extends CoreEntity {
    @Column()
    @IsString()
    memo: string;

    @ManyToOne((type) => Member, (member) => member.deliveryMemos)
    @JoinColumn()
    member: Member;
}