import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsOptional, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Member } from "../../member/entities/member.entity";

@Entity('deliveries')
export class Delivery extends CoreEntity {
    @Column()
    @IsString()
    customerName: string;
    
    @Column()
    @IsString()
    phoneNumber: string;

    @Column()
    @IsString()
    address: string;
    
    @Column({default: false})
    @IsOptional()
    isDefault?: boolean;

    @ManyToOne((type) => Member, (member) => member.deliveries)
    @JoinColumn()
    member: Member;
}