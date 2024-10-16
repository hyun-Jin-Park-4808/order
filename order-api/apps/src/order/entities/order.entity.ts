import { CoreEntity } from "@app/common/entities/common/core.entity";
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Member } from "../../member/entities/member.entity";
import { Payment, PayMethod } from "../../payment/entities/payment.entity";
import { OrderItem } from "./order-item.entity";

export enum OrderStatus {
    BEFORE_PAYMENT = 'BEFORE_PAYMENT',
    COMPLETE_PAYMENT = 'COMPLETE_PAYMENT',
    FULL_CANCEL = 'FULL_CANCEL',
    PARTIAL_CANCEL = 'PARTIAL_CANCEL',
    FULL_REFUND = 'FULL_REFUND',
    PARTIAL_REFUND = 'PARTIAL_REFUND',
    BEFORE_DELIVERY = 'BEFORE_DELIVERY',
    IN_DELIVERY = 'IN_DELIVERY',
    COMPLETED_DELIVERY = 'COMPLETED_DELIVERY',
    IN_RETURN = 'IN_RETURN',
    RETURN = 'RETURN',
    CONFIRMED = 'CONFIRMED'
}

export enum ReversalType {
    APPLY_REFUND = 'APPLY_REFUND',
    APPLY_PARTIAL_REFUND = 'APPLY_PARTIAL_REFUND',
    COMPLETE_FULL_CANCEL = 'COMPLETE_FULL_CANCEL',
    COMPLETE_PARTIAL_CANCEL = 'COMPLETE_PARTIAL_CANCEL',
    COMPLETE_FULL_REFUND = 'COMPLETE_FULL_REFUND',
    COMPLETE_PARTIAL_REFUND = 'COMPLETE_PARTIAL_REFUND'
}

export enum RefundShippingFeeType {
    BUYER_RESPONSIBILITY = 'BUYER_RESPONSIBILITY',
    SELLER_RESPONSIBILITY = 'SELLER_RESPONSIBILITY'
}

@Entity('orders')
export class Order extends CoreEntity {
    @Column({default: 0})
    @IsNumber()
    @IsOptional()
    shippingFee?: number;

    @Column()
    @IsNumber()
    totalAmount: number;

    @Column({default: 0})
    @IsNumber()
    @IsOptional()
    pointAmount?: number;

    @Column({default: 0})
    @IsNumber()
    @IsOptional()
    couponAmount?: number;

    @Column({default: 0.00})
    @IsNumber()
    @Min(0.00)
    @Max(100.00)
    @IsOptional()
    commission?: number;

    @Column({
        type: 'enum',
        enum: ReversalType,
        nullable: true
    })
    @IsEnum(ReversalType)
    @IsOptional()
    reversalType?: ReversalType;

    @Column({
        type: 'enum',
        enum: RefundShippingFeeType,
        nullable: true
    })
    @IsEnum(RefundShippingFeeType)
    @IsOptional()
    refundShippingFeeType?: RefundShippingFeeType;

    @Column({nullable: true, comment: 'payment 테이블에 저장하기 전 임시 보관용'})
    @IsString()
    @IsOptional()
    reasonForReversal?: string;

    @Column({ nullable: true })
    @IsString()
    @IsOptional()
    customerName?: string;

    @Column({ nullable: true })
    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @Column({ nullable: true })
    @IsString()
    @IsOptional()
    address?: string;

    @Column({ nullable: true })
    @IsString()
    @IsOptional()
    deliveryMemo?: string;

    @Column({type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.BEFORE_PAYMENT
    })
    @IsEnum(OrderStatus)
    orderStatus?: OrderStatus;

    @Column({ nullable: true })
    @IsString()
    @IsOptional()
    paymentId?: string;

    @Column({ nullable: true })
    @IsEnum(PayMethod)
    @IsOptional()
    payMethod?: PayMethod;

    @ManyToOne((type) => Member, (member) => member.orders)
    @JoinColumn()
    member: Member;

    @OneToMany((type) => OrderItem, (orderItem) => orderItem.order, {cascade: true})
    orderItems?: OrderItem[];

    @OneToMany(() => Payment, (payment) => payment.order, {cascade: true})
    payments?: Payment[]; 
}