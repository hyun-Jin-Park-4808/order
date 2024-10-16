import { GetELKProductResponse } from '@app/common/dto/product/get-elk-product.dto';
import { ServiceBrand } from '@app/common/entities/brand/service-brand.entity';
import { ServiceProductSellingStatus } from '@app/common/entities/product/service-product.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { ServiceMallAPI } from '../../apis/service-mall.api';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CartItemRepository } from '../../cart/entities/cart-item.repository';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { Product } from '../../product/entities/product.entity';
import { ProductRepository } from '../../product/entities/product.repository';
import { CartItemsOrderInput } from '../dto/cart-items.order.input.dto';
import { ProductsOrderInput } from '../dto/products.order.input.dto';
import { OrderItemRepository } from '../entities/order-item.repository';
import { Order, OrderStatus, RefundShippingFeeType, ReversalType } from '../entities/order.entity';
import { OrderRepository } from '../entities/order.repository';
import { OrderCommandService } from '../service/order.service.command';
import { OrderItem, OrderItemStatus } from '../entities/order-item.entity';
import { BadRequestException } from '@nestjs/common';
import { RefundInput } from '../dto/refund.input.dto';

describe('OrderCommandService', () => {
  let service: OrderCommandService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let serviceMallApi: ServiceMallAPI

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderCommandService, MemberRepository,
        ProductRepository, CartItemRepository, ServiceMallAPI,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }
      ],
    }).compile();

    service = module.get<OrderCommandService>(OrderCommandService);
    connection = module.get<Connection>(Connection);
    serviceMallApi = module.get<ServiceMallAPI>(ServiceMallAPI);

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
  });

  // 각 테스트 이후 모킹 초기화
  afterEach(() => {
    jest.clearAllMocks();
  })

  /**
   * 1. 장바구니 상품 주문하기 
  * 회원 정보를 검증한다. 
  * - 인증되지 않은 회원이거나 존재하지 않는 회원이면 예외 처리를 한다. (공동 예외이므로 테스트 코드는 패스)
  * 주문 엔티티를 생성한다.
  * 장바구니 상품을 불러온다.
  * - 장바구니 상품이 존재하지 않으면 예외 처리를 한다.
  * - 장바구니 상품이 판매상태가 OPEN이 아니면 예외 처리를 한다. 
  * 입력된 배송비의 유효성을 검증한다. 
  * 위에서 만든 주문 엔티티의 정보와 선택된 장바구니 상품들을 order_items로 변경한다. 
  * - 옵션 내역은 orderOptionDetails 테이블에 저장한다. 
   */
  describe('orderCartItems', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = {
      email: 'test@email.com',
      isVerified: true,
      id: 1
    };
    const product: Product = {
      id: 1, productName: 'product1', price: 1000,
      salePrice: 1000, brandName: 'brand1', shippingFee: 0
    };
    const cartItemsOrderInput: CartItemsOrderInput = {
      itemIds: [1, 2],
      totalAmount: 0,
      shippingFee: 0
    };
    const cartItem1: CartItem = { id: 1, product: product, quantity: 3 };
    const cartItem2: CartItem = { id: 2, product: product, quantity: 3 };
    const existedcartItems: CartItem[] = [cartItem1, cartItem2];
    const order: Order = {
      shippingFee: 0,
      totalAmount: 6000,
      member: member,
      id: 1
    };
    const serviceProduct: GetELKProductResponse = {
      data: {
        productName: 'product1',
        sellingStatus: ServiceProductSellingStatus.OPEN,
        hasOption: false,
        price: 1000,
        salePrice: 1000,
        detailUrl: '',
        brand: new ServiceBrand,
        id: 1,
        style: [],
        color: [],
        mainMaterial: [],
        usage: [],
        classification: [],
        tags: [],
        environment: '',
        isDefaultPointSaveRate: false,
        stock: 100
      },
      status: '',
      code: 0,
      timestamp: ''
    };

    it('성공 케이스', async () => {
      const saveMock = jest.fn();
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(member)
            };
          if (repo === OrderRepository)
            return {
              save: jest.fn().mockResolvedValue(order)
            };
          if (repo === CartItemRepository)
            return {
              getWithDetailByIds: jest.fn().mockResolvedValue(existedcartItems)
            };
          if (repo === OrderItemRepository)
            return {
              save: saveMock
            };
          if (repo === ProductRepository)
            return {
              save: jest.fn().mockResolvedValue(product)
            };
        });
      jest.spyOn(serviceMallApi, 'getProduct')
        .mockResolvedValue(serviceProduct);

      await service.orderCartItems(emailInput, cartItemsOrderInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalledTimes(existedcartItems.length);
    });

    it('배송비 유효성 검증 실패 케이스', async () => {
      const cartItemsOrderInput: CartItemsOrderInput = {
        itemIds: [1, 2],
        totalAmount: 0,
        shippingFee: 1000
      };
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(member)
            };
          if (repo === CartItemRepository)
            return {
              getWithDetailByIds: jest.fn().mockResolvedValue(existedcartItems)
            };
        });
      await expect(service.orderCartItems(emailInput, cartItemsOrderInput))
        .rejects
        .toThrow(new BadRequestException(`shippingFee is not correct. 
                        expectedShippingFee: ${cartItemsOrderInput.shippingFee}, realShippingFee: 0`));

    });
  })

  /**
 * 2. 상품 바로 주문하기 
 * 회원 정보를 검증한다. 
 * - 인증되지 않은 회원이거나 존재하지 않는 회원이면 예외 처리를 한다. (공동 예외이므로 테스트 코드는 패스)
 * 주문 엔티티를 생성한다. 
 * 상품의 옵션 리스트를 돌면서 각 상품을 불러온다. 
 * - 상품이 존재하지 않으면 예외 처리를 한다. 
 * - 상품이 판매 상태가 OPEN이 아니면 예외 처리를 한다. 
 * 상품의 수량, 옵션의 수량 둘 다 없으면 예외 처리를 한다. 
 * - 위에서 만든 주문 엔티티의 정보와 선택된 상품의 옵션들을 order_items로 변경한다.
 */
  describe('orderProducts', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = {
      email: 'test@email.com',
      isVerified: true,
      id: 1
    };
    const product: Product = {
      id: 1, productName: 'product1', price: 1000,
      salePrice: 1000, brandName: 'brand1'
    };
    const productsOrderInput: ProductsOrderInput = {
      totalAmount: 13000,
      productId: 1,
      quantity: 13
    };
    const order: Order = {
      shippingFee: 0,
      totalAmount: 13000,
      member: member,
      id: 1
    };
    const serviceProduct1: GetELKProductResponse = {
      data: {
        productName: 'product1',
        sellingStatus: ServiceProductSellingStatus.OPEN,
        hasOption: false,
        price: 1000,
        salePrice: 1000,
        detailUrl: '',
        brand: new ServiceBrand,
        id: 1,
        style: [],
        color: [],
        mainMaterial: [],
        usage: [],
        classification: [],
        tags: [],
        environment: '',
        isDefaultPointSaveRate: false,
        stock: 100
      },
      status: '',
      code: 0,
      timestamp: ''
    };
    const orderItem1: OrderItem = {
      brandName: 'brand1',
      productName: 'product1',
      price: 1000,
      salePrice: 1000,
      quantity: 3,
      product: product,
      id: 1
    };

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return {
              getByEmail: jest.fn().mockResolvedValue(member)
            };
          if (repo === OrderRepository)
            return {
              save: jest.fn().mockResolvedValue(order)
            };
          if (repo === ProductRepository)
            return {
              getById: jest.fn().mockResolvedValue(product),
              save: jest.fn().mockResolvedValue(product)
            };
          if (repo === OrderItemRepository)
            return {
              save: jest.fn().mockResolvedValue(orderItem1)
            }
        });

      jest.spyOn(serviceMallApi, 'getProduct')
        .mockResolvedValue(serviceProduct1);

      const result = await service.orderProducts(emailInput, productsOrderInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.totalAmount).toBe(13000);
    });

    it('수량값이 존재하지 않아 발생하는 실패 케이스', async () => {
      const productsOrderInput: ProductsOrderInput = {
        totalAmount: 13000,
        productId: 1
      };
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return {
            getByEmail: jest.fn().mockResolvedValue(member)
          };
        if (repo === ProductRepository)
          return {
            getById: jest.fn().mockResolvedValue(product),
            save: jest.fn().mockResolvedValue(product)
          };
      });

    jest.spyOn(serviceMallApi, 'getProduct')
      .mockResolvedValue(serviceProduct1);

      await expect(service.orderProducts(emailInput, productsOrderInput))
      .rejects
      .toThrow(new BadRequestException('quantity is missing.'));
    });
  })

  /* 3. 환불 신청하기 
  * 이메일을 통해 멤버를 검증한다. 
  * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
  * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
  * 환불/부분 환불 요청이 들어온 order를 조회한다.
  * - order가 존재하지 않으면 에러를 발생시킨다. 
  * - orderStatus가 배송 완료 상태가 아니면 에러를 발생시킨다. 
  * 환불 요청이 들어온 orderItems의 orderStatus를 확인하고, 환불 신청 상태로 변경해준다.
  * - orderItems가 존재하지 않으면 에러를 발생시킨다. (공통 에러)
  * - orderItemStatus가 SUCCESS가 아니면 에러를 발생시킨다.    
  * - 결제 완료 상태인 물건이 아니면 에러를 발생시킨다. 
  * 환불 신청 정보를 order에 업데이트한다.
  */
  describe('applyRefund', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = {
      email: 'test@email.com',
      isVerified: true,
      id: 1
    };
    const orderItem1: OrderItem = {
      brandName: 'brand1',
      productName: 'product1',
      price: 1000,
      salePrice: 1000,
      quantity: 3,
      product: new Product,
      id: 1,
      orderItemStatus: OrderItemStatus.SUCCESS
    };
    const order: Order = {
      shippingFee: 0,
      totalAmount: 13000,
      member: member,
      id: 1,
      orderItems: [orderItem1]
    };
    const refundInput: RefundInput = {
      orderId: 1,
      reversalType: ReversalType.APPLY_REFUND,
      refundShippingFeeType: RefundShippingFeeType.BUYER_RESPONSIBILITY,
      reasonForRefund: '단순 변심'
    }

    it('성공 케이스', async () => {
      order.orderStatus = OrderStatus.COMPLETED_DELIVERY;

      const applyRefundOrder: Order = {
        ...order,
        reversalType: ReversalType.APPLY_REFUND,
        refundShippingFeeType: RefundShippingFeeType.BUYER_RESPONSIBILITY,
        reasonForReversal: refundInput.reasonForRefund
      }

      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return {
            validateMember: jest.fn().mockResolvedValue(void 0)
          };
        if (repo === OrderRepository)
          return {
            getById: jest.fn().mockResolvedValue(order),
            save: jest.fn().mockResolvedValue(applyRefundOrder),
          };
        if (repo === OrderItemRepository)
          return {
            getByIds: jest.fn().mockResolvedValue([orderItem1])
          }
      });
    await service.applyRefund(emailInput, refundInput);

    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(order.orderStatus).toBe(OrderStatus.IN_RETURN);
    })


    it('orderStatus가 배송 완료가 아닐 때 발생하는 실패 케이스', async () => {
      order.orderStatus = OrderStatus.PARTIAL_REFUND;

      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return {
            validateMember: jest.fn().mockResolvedValue(void 0)
          };
        if (repo === OrderRepository)
          return {
            getById: jest.fn().mockResolvedValue(order)
          };
        if (repo === OrderItemRepository)
          return {
            getByIds: jest.fn().mockResolvedValue([orderItem1])
          }
      });
      
      await expect(service.applyRefund(emailInput, refundInput))
      .rejects
      .toThrow(new BadRequestException(`OrderStatus is not COMPLETED_DELIVERY. status: ${order.orderStatus}`));

    })

    it('부분 환불 신청 시 orderItems가 존재하지 않아 발생하는 실패 케이스', async () => {
      order.orderStatus = OrderStatus.COMPLETED_DELIVERY;
      orderItem1.orderItemStatus = OrderItemStatus.FAILED;

      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return {
            validateMember: jest.fn().mockResolvedValue(void 0)
          };
        if (repo === OrderRepository)
          return {
            getById: jest.fn().mockResolvedValue(order)
          };
        if (repo === OrderItemRepository)
          return {
            getByIds: jest.fn().mockResolvedValue([orderItem1])
          }
      });
      
      await expect(service.applyRefund(emailInput, refundInput))
      .rejects
      .toThrow(new BadRequestException(`OrderItemStatus is not SUCCESS. status: ${orderItem1.orderItemStatus}`));
    })
  })
});
