import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { SQS } from "aws-sdk";
import { Connection, QueryRunner } from "typeorm";
import { GetCancelPaymentResponse, GetPaymentResponse, PortOneAPI } from "../../apis/portone.api";
import { DeliveryMemo } from "../../delivery-memo/enitities/delivery-memo.entity";
import { DeliveryMemoRepository } from "../../delivery-memo/enitities/delivery-memo.repository";
import { Delivery } from "../../delivery/entities/delivery.entity";
import { DeliveryRepository } from "../../delivery/entities/delivery.repository";
import { EmailInput } from "../../member/dto/email.input.dto";
import { Member } from "../../member/entities/member.entity";
import { MemberRepository } from "../../member/entities/member.repository";
import { OrderItem, OrderItemStatus } from "../../order/entities/order-item.entity";
import { Order, OrderStatus, RefundShippingFeeType, ReversalType } from "../../order/entities/order.entity";
import { OrderRepository } from "../../order/entities/order.repository";
import { Product } from "../../product/entities/product.entity";
import { CancelPaymentInput, CancelRequester, PortOnePaymentCancelInput } from "../dto/cancel.payment.input.dto";
import { PaymentAmount } from "../dto/payment.amount.dto";
import { PaymentInput } from "../dto/payment.input.dto";
import { PortOnePaymentCancelOutput } from "../dto/portone-payment.cancel.output.dto";
import { PaymentCancellation, PaymentCanCelStatus } from "../dto/portone-payment.cancellation.dto";
import { PaymentStatus, PortOnePaymentOutput } from "../dto/portone-payment.output.dto";
import { Payment, PayMethod } from "../entities/payment.entity";
import { PaymentRepository } from "../entities/payment.repository";
import { PaymentCommandService } from "../service/payment.service.command";
import { OrderItemRepository } from "apps/src/order/entities/order-item.repository";

jest.mock('aws-sdk', () => {
    const sendMessageMock = jest.fn();

    return {
        SQS: jest.fn(() => ({
            sendMessage: sendMessageMock,
        })),
        config: {
            update: jest.fn()
        }
    };
});

describe('PaymentService', () => {
    let service: PaymentCommandService;
    let connection: Connection;
    let queryRunner: QueryRunner;
    let portOneAPI: PortOneAPI;
    let sendMessageMock: jest.Mock;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentCommandService, PortOneAPI,
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: Connection, useValue: { createQueryRunner: jest.fn() } }
            ],
        }).compile();

        service = module.get<PaymentCommandService>(PaymentCommandService);
        connection = module.get<Connection>(Connection);
        portOneAPI = module.get<PortOneAPI>(PortOneAPI);

        queryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                getCustomRepository: jest.fn(),
            },
        } as any;

        (connection.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);

        sendMessageMock = jest.fn();
        (SQS as undefined as jest.Mock).mockImplementation(() => ({
            sendMessage: sendMessageMock,
        }));
    });

    // 각 테스트 이후 모킹 초기화
    afterEach(() => {
        jest.clearAllMocks();
    })

    /* 1. 결제하기 
     * 이메일을 통해 멤버를 검증한다. 
     * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
     * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
     * 포트원 결제내역 단건조회 API를 호출한다. 
     * - API가 정상적으로 호출되지 않은 경우 에러를 발생시킨다. 
     * 주문 정보(order, delivery, deliveryMemo)를 찾고, order 엔티티에 배송 정보를 업데이트한다.
     * 포트원 결제내역 단건조회 API 결과에 따라 paymentStatus를 결정한다. 
     * - 결제 금액과 포인트, 쿠폰 차감 금액의 합이 order의 totalAmount + shippingFee와 일치하지 않으면 위변조 상태를 저장한다. 
     * payment 정보를 db에 저장한다. 
    */
    describe('payment', () => {
        const emailInput: EmailInput = { email: 'test@email.com' };
        const member: Member = { id: 1, email: emailInput.email };
        const orderItem: OrderItem = {
            brandName: 'brand1',
            productName: 'product1',
            price: 10,
            salePrice: 10,
            quantity: 10,
            product: new Product,
            id: 1
        };
        const order: Order = {
            shippingFee: 0,
            totalAmount: 100,
            member: member,
            id: 1,
            orderItems: [orderItem]
        };
        const delivery: Delivery = {
            customerName: "Name",
            phoneNumber: "010-1234-5678",
            address: "서울특별시 송파구 석촌동 13",
            member: member,
            id: 1
        };
        const deliveryMemo: DeliveryMemo = {
            memo: "문 앞에 놓아주세요.",
            member: member,
            id: 1
        };
        const paymentInput: PaymentInput = {
            paymentId: "paymentId",
            orderId: order.id,
            payMethod: PayMethod.CARD,
            deliveryId: delivery.id,
            deliveryMemoId: deliveryMemo.id,
            pointAmount: 0,
            couponAmount: 0
        };
        const payment: Payment = {
            paymentId: paymentInput.paymentId,
            payMethod: paymentInput.payMethod,
            paymentStatus: PaymentStatus.PAID,
            id: 1,
            paymentAmount: 100
        };

        const paymentAmount: PaymentAmount = {
            total: 100,
            taxFree: 0,
            vat: 0,
            supply: 0,
            discount: 0,
            paid: 100,
            cancelled: 0,
            cancelledTaxFree: 0
        };

        const portOnePaymentOutput: PortOnePaymentOutput = {
            status: "PAID",
            id: "paymentId",
            transactionId: "transactionId",
            requestedAt: "2024-09-09 15:14:47.636989",
            updatedAt: "2024-09-09 15:14:47.636989",
            orderName: "1",
            amount: paymentAmount,
        };

        const paymentResponse: GetPaymentResponse = {
            data: portOnePaymentOutput,
            ok: true,
            statusCode: 200
        };

        it('성공 케이스', async () => {
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
                .mockImplementation((repo) => {
                    if (repo === MemberRepository)
                        return {
                            validateMember: jest.fn().mockResolvedValue(member)
                        };
                    if (repo === OrderRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(order),
                            save: jest.fn().mockResolvedValue(order)
                        };
                    if (repo === DeliveryRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(delivery)
                        };
                    if (repo === DeliveryMemoRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(deliveryMemo)
                        };
                    if (repo === PaymentRepository)
                        return {
                            save: jest.fn().mockResolvedValue(payment)
                        };
                });
            jest.spyOn(portOneAPI, 'getPayment')
                .mockResolvedValue(paymentResponse);

            const result = await service.payment(emailInput, paymentInput);

            expect(queryRunner.startTransaction).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(result.payMethod).toEqual(paymentInput.payMethod);
            expect(sendMessageMock).toHaveBeenCalledTimes(1);
        })


        it('위변조로 저장되는 케이스', async () => {
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
                .mockImplementation((repo) => {
                    if (repo === MemberRepository)
                        return {
                            validateMember: jest.fn().mockResolvedValue(member)
                        };
                    if (repo === OrderRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(order),
                            save: jest.fn().mockResolvedValue(order)
                        };
                    if (repo === DeliveryRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(delivery)
                        };
                    if (repo === DeliveryMemoRepository)
                        return {
                            getById: jest.fn().mockResolvedValue(deliveryMemo)
                        };
                    if (repo === PaymentRepository)
                        return {
                            save: jest.fn().mockResolvedValue(payment)
                        };
                });
            jest.spyOn(portOneAPI, 'getPayment')
                .mockResolvedValue(paymentResponse);

            const result = await service.payment(emailInput, paymentInput);

            expect(queryRunner.startTransaction).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(result.payMethod).toEqual(paymentInput.payMethod);
            expect(sendMessageMock).toHaveBeenCalledTimes(1);
        })

        it('api가 제대로 호출되지 않아 발생하는 실패 케이스', async () => {
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
                .mockImplementation((repo) => {
                    if (repo === MemberRepository)
                        return {
                            validateMember: jest.fn().mockResolvedValue(member)
                        };
                });

            await expect(service.payment(emailInput, paymentInput))
                .rejects
                .toThrow(new BadRequestException(
                    "PortOneAPI is not working"
                ));
        })
    })

    /* 2. 결제 취소하기(취소/환불)
 * 이메일을 통해 멤버를 검증한다. 
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
 * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
 * orderId를 통해 해당 주문 내역을 조회한다.
 * - order가 존재하지 않으면 에러를 발생시킨다. (공동 에러)
 * - IN_RETURN, COMPLETE_PAYMENT, BEFORE_DELIVERY, COMPLETED_DELIVERY인 상품이 아니면 에러를 발생시킨다.
 * - 부분 환불, 부분 취소의 경우, 취소 혹은 환불한 orderItemIds가 없으면 에러를 발생시킨다.  
 * 환불 or 결제 취소 타입을 설정한다. 
 * 환불인 경우, 기존 order의 reversalType이 환불/부분 환불 신청 상태인지 확인한다.
 * - 환불 신청이 안 된 경우 에러를 발생시킨다. 
 * - 기존 order에 입력된 환불 사유로 reason을 업데이트한다. 
 * - 배송비를 결정한다. 
 * 환불/취소 요청이 들어온 orderItems의 orderStatus를 확인하고, 취소/환불 완료 상태로 변경해준다.
 * - orderItems가 존재하지 않으면 에러를 발생시킨다. (공통 에러 처리)   
 * - 이미 구매 확정, 환불 완료 혹은 취소 처리가 된 물건이면 에러를 발생시킨다. (공통 에러 처리)
 * 환불/취소 내용에 따라 환불 배송비 등 취소 금액을 입력하여 포트원 결제 취소 API를 호출한다. 
 * - API가 정상적으로 호출되지 않을 경우, 에러를 발생시킨다. (공통 에러 처리)
 * - 결제 취소가 제대로 이뤄지지 않을 경우 에러를 발생시킨다. 
 * 환불/취소 상태를 order에 업데이트한다. 
 * API 결과에 따라 새로운 payment 내역을 저장한다. 
 */
    describe('cancelPayment', () => {
        const emailInput: EmailInput = { email: 'test@email.com' };
        const member: Member = { id: 1, email: emailInput.email };
        const payment: Payment = {
            paymentId: "paymentId",
            payMethod: PayMethod.CARD,
            paymentStatus: PaymentStatus.CANCELED,
            paymentAmount: 100,
            id: 1
        }

        const paymentCancellation: PaymentCancellation = {
            status: PaymentCanCelStatus.SUCCEEDED,
            id: "1",
            totalAmount: 0,
            taxFreeAmount: 0,
            vatAmount: 0,
            reason: "단순 변심",
            requestedAt: ""
        };

        const portOnePaymentCancelOutput: PortOnePaymentCancelOutput = {
            cancellation: paymentCancellation
        }

        const cancelPaymentResponse: GetCancelPaymentResponse = {
            data: portOnePaymentCancelOutput,
            ok: true,
            statusCode: 200
        }

        it('환불 성공 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.APPLY_REFUND
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.IN_RETURN,
                reversalType: ReversalType.APPLY_REFUND,
                refundShippingFeeType: RefundShippingFeeType.BUYER_RESPONSIBILITY,
                reasonForReversal: "단순 변심",
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.ADMIN
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order),
                        save: jest.fn().mockResolvedValue(order)
                    };
                if (repo === PaymentRepository)
                    return {
                        save: jest.fn().mockResolvedValue(payment)
                    };
            });
        jest.spyOn(portOneAPI, 'cancelPayment')
            .mockResolvedValue(cancelPaymentResponse);

        await service.cancelPayment(emailInput, rawInput);

        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(order.reversalType).toEqual(ReversalType.COMPLETE_FULL_REFUND);
        })

        it('취소 성공 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.SUCCESS
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.BEFORE_DELIVERY,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.USER,
                reason: "단순 변심"
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order),
                        save: jest.fn().mockResolvedValue(order)
                    };
                if (repo === PaymentRepository)
                    return {
                        save: jest.fn().mockResolvedValue(payment)
                    };
            });
        jest.spyOn(portOneAPI, 'cancelPayment')
            .mockResolvedValue(cancelPaymentResponse);

        await service.cancelPayment(emailInput, rawInput);

        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(order.reversalType).toEqual(ReversalType.COMPLETE_FULL_CANCEL);
        })

        it('이미 구매 확정된 order라서 발생하는 실패 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.SUCCESS
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.CONFIRMED,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.USER,
                reason: "단순 변심"
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order)
                    };
            });

            await expect(service.cancelPayment(emailInput, rawInput))
                .rejects
                .toThrow(new BadRequestException(
                    `This order can't be canceled or refunded. status: ${order.orderStatus}`
                ));
        })

        it('부분 환불인데 orderItemsIds가 없어 발생하는 실패 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.SUCCESS
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.BEFORE_DELIVERY,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.USER,
                reason: "단순 변심"
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: true
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order)
                    };
            });

            await expect(service.cancelPayment(emailInput, rawInput))
                .rejects
                .toThrow(new BadRequestException(
                    'Partial reversal need to orderItemIds.'
                ));
        })

        it('환불 신청한 상태가 아니어서 발생하는 실패 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.SUCCESS
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.IN_RETURN,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.ADMIN
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order)
                    };
            });

            await expect(service.cancelPayment(emailInput, rawInput))
                .rejects
                .toThrow(new BadRequestException(
                    'There is no refund apply.'
                ));
        })

        it('이미 구매 확정된 orderItem이 있어서 발생하는 실패 케이스', async () => {
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.CONFIRMED
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.BEFORE_DELIVERY,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.USER,
                reason: "단순 변심"
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order)
                    };
            });

            await expect(service.cancelPayment(emailInput, rawInput))
                .rejects
                .toThrow(new BadRequestException(
                    `Status is already refund or cancel or confirmed. status: ${orderItem.orderItemStatus}`
                ));
        })

        it('결제 취소가 제대로 이뤄지지 않아 발생하는 실패 케이스', async () => {
            const paymentCancellation: PaymentCancellation = {
                status: PaymentCanCelStatus.FAILED,
                id: "1",
                totalAmount: 0,
                taxFreeAmount: 0,
                vatAmount: 0,
                reason: "단순 변심",
                requestedAt: ""
            };
    
            const portOnePaymentCancelOutput: PortOnePaymentCancelOutput = {
                cancellation: paymentCancellation
            }
    
            const cancelPaymentResponse: GetCancelPaymentResponse = {
                data: portOnePaymentCancelOutput,
                ok: true,
                statusCode: 200
            }
            const orderItem: OrderItem = {
                brandName: 'brand1',
                productName: 'product1',
                price: 10,
                salePrice: 10,
                quantity: 10,
                product: new Product,
                id: 1,
                orderItemStatus: OrderItemStatus.SUCCESS
            };
            const order: Order = {
                shippingFee: 0,
                totalAmount: 100,
                member: member,
                id: 1,
                orderItems: [orderItem],
                orderStatus: OrderStatus.BEFORE_DELIVERY,
                paymentId: "paymentId"
            };
    
            const portOnePaymentCancelInput: PortOnePaymentCancelInput = {
                amount: 100,
                requester: CancelRequester.USER,
                reason: "단순 변심"
            }
            const rawInput: CancelPaymentInput = {
                portOnePaymentCancelInput: portOnePaymentCancelInput,
                orderId: 1,
                isPartial: false
            }
            jest.spyOn(queryRunner.manager, 'getCustomRepository')
            .mockImplementation((repo) => {
                if (repo === MemberRepository)
                    return {
                        validateMember: jest.fn().mockResolvedValue(member)
                    };
                if (repo === OrderRepository)
                    return {
                        getById: jest.fn().mockResolvedValue(order),
                        save: jest.fn().mockResolvedValue(order)
                    };
                if (repo === PaymentRepository)
                    return {
                        save: jest.fn().mockResolvedValue(payment)
                    };
            });
        jest.spyOn(portOneAPI, 'cancelPayment')
            .mockResolvedValue(cancelPaymentResponse);

            await expect(service.cancelPayment(emailInput, rawInput))
                .rejects
                .toThrow(new BadRequestException(
                    'cancellation is not succeeded.'
                ));
        })
    })
});

