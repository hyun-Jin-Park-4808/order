import { CoreEntity } from "@app/common/entities/common/core.entity";
import { Order } from "../../order/entities/order.entity";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { PaymentStatus } from "../dto/portone-payment.output.dto";

export enum PayMethod {
    CARD = 'CARD',
    TRANSFER = 'TRANSFER',
    MOBILE = 'MOBILE',
    GIFT_CERTIFICATE = 'GIFT_CERTIFICATE',
    EASY_PAY = 'EASY_PAY',
    PAYPAL = 'PAYPAL',
    ALIPAY = 'ALIPAY'
}

export enum PaymentReversalType {
    FULL_REFUND = 'FULL_REFUND',
    PARTIAL_REFUND = 'PARTIAL_REFUND',
    FULL_CANCEL = 'FULL_CANCEL',
    PARTIAL_CANCEL = 'PARTIAL_CANCEL'
}

@Entity('payments')
export class Payment extends CoreEntity {
    @Column()
    @IsString()
    paymentId: string;

    @Column({type: 'enum',
        enum: PayMethod
      })
    @IsEnum(PayMethod)
    payMethod: string;

    @Column()
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;

    @Column()
    @IsNumber()
    paymentAmount: number;

    @Column({type: 'enum',
        enum: PaymentReversalType,
        nullable: true
      })
    @IsEnum(PaymentReversalType)
    @IsOptional()
    paymentReversalType?: PaymentReversalType;

    @Column({nullable: true})
    @IsNumber()
    @IsOptional()
    cancelAmount?: number;

    @Column({nullable: true})
    @IsNumber()
    @IsOptional()
    refundShippingFee?: number;

    @Column({nullable: true})
    @IsString()
    @IsOptional()
    reasonForReversal?: string;

    @ManyToOne((type) => Order, (order) => order.payments)
    @JoinColumn()
    order?: Order;
}