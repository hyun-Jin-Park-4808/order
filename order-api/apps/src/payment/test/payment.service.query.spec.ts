import { Test, TestingModule } from '@nestjs/testing';
import { PaymentQueryService } from '../service/payment.service.query';
import { Connection, QueryRunner } from 'typeorm';
import { MemberRepository } from '../../member/entities/member.repository';
import { PaymentRepository } from '../entities/payment.repository';
import { OrderRepository } from '../../order/entities/order.repository';
import { GetPaymentsInput } from '../dto/get-payments.input.dto';
import { Payment } from '../entities/payment.entity';
import { NotFoundException } from '@nestjs/common';
import { EmailInput } from '../../member/dto/email.input.dto';
import { PaymentStatus } from '../dto/portone-payment.output.dto';
import { ConfigService } from '@nestjs/config';

describe('PaymentQueryService', () => {
  let service: PaymentQueryService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let orders: OrderRepository;
  let payments: PaymentRepository;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentQueryService, MemberRepository,
        PaymentRepository, OrderRepository, ConfigService,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }
      ],
    }).compile();

    service = module.get<PaymentQueryService>(PaymentQueryService);
    connection = module.get<Connection>(Connection);
    orders = module.get<OrderRepository>(OrderRepository);
    payments = module.get<PaymentRepository>(PaymentRepository);
    configService = module.get<ConfigService>(ConfigService)

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getCustomRepository: jest.fn(),
        getRepository: jest.fn(),
      },
    } as any;

    (connection.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

    afterEach(() => {
      jest.clearAllMocks();
    })

  /* 1. 결제 내역 조회하기 
 * 이메일을 통해 멤버를 검증한다. 
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
 * - 멤버가 존재하지 않으면 에러를 발생시킨다.  '
 * orderId를 통해 order 정보가 있는지 검증한다. 
 * - order가 존재하지 않으면 에러를 발생시킨다. 
 * orderId를 통해 결제 목록을 조회하고 페이징처리하여 반환한다.
 */
  describe('getPayments', () => {
    const getPaymentsInput: GetPaymentsInput = {
      email: 'test@email.com',
      pageNumber: 1,
      pageSize: 1
    };
    const payments: Payment[] = [new Payment, new Payment];
    const totalCount = 2;

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return { validateMember: jest.fn().mockResolvedValue(void 0) };
        if (repo === OrderRepository)
          return {
            validateOrder: jest.fn().mockResolvedValue(void 0),
          };
      });

      const mockedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([payments, totalCount]),
      };
  
      const mockRepository = {
        createQueryBuilder: jest.fn(() => mockedQueryBuilder),
      };
  
      jest.spyOn(queryRunner.manager, 'getRepository')
      .mockReturnValue(mockRepository as any);

      const result = await service.getPayments(getPaymentsInput, 1);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result[1]).toBe(totalCount);
    });

    it('order가 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(orders, 'findOne').mockResolvedValue(null);

      await expect(orders.validateOrder(1)).rejects
      .toThrow(
        new NotFoundException('Not found order, orderId: 1')
      );
    });
  })

  /* 2. 결제 내역 상세 조회하기 
 * 이메일을 통해 멤버를 검증한다. 
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
 * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
 * paymentId를 통해 결제 내역을 조회한다.
 * - 결제 내역이 존재하지 않으면 에러를 발생시킨다. 
 */
  describe('getPayment', () => {
    const emailInput: EmailInput = {
      email: 'test@email.com'
    }
    const payment: Payment = {
      paymentId: '1',
      payMethod: 'CARD',
      paymentStatus: PaymentStatus.PAID,
      paymentAmount: 10,
      id: 1
    }
    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return { validateMember: jest.fn().mockResolvedValue(void 0) };
        if (repo === PaymentRepository)
          return { getById: jest.fn().mockResolvedValue(payment)};
      });

      const result = await service.getPayment(1, emailInput);
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.id).toBe(1);

    })

    it('결제 내역이 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(payments, 'findOne').mockResolvedValue(null);

      await expect(payments.getById(1)).rejects
      .toThrow(
        new NotFoundException('Not found payment, id: 1')
      );
    })
  })
});
