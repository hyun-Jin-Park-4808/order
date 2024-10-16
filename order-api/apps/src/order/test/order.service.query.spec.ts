import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { Member } from '../../member/entities/member.entity';
import { OrderRepository } from '../entities/order.repository';
import { OrderQueryService } from '../service/order.service.query';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Order } from '../entities/order.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { GetOrdersInput } from '../dto/get-orders.input.dto';

describe('OrderQueryService', () => {
  let service: OrderQueryService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let orders: OrderRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderQueryService, OrderRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }],
    }).compile();

    service = module.get<OrderQueryService>(OrderQueryService);
    connection = module.get<Connection>(Connection);
    orders = module.get<OrderRepository>(OrderRepository);

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

  /* 1. 주문 내역 상세 조회하기 
* 이메일을 통해 멤버를 검증한다. 
* - 멤버가 인증되지 않았으면 에러를 발생시킨다.
* - 멤버가 존재하지 않으면 에러를 발생시킨다. (공동 에러)
* orderId를 통해 주문 내역을 조회한다.
* - 주문 내역이 존재하지 않으면 에러를 발생시킨다. (공동 에러)
*/
  describe('getOrder', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = { id: 1, email: emailInput.email };
    const order: Order = {
      totalAmount: 100,
      member: member,
      id: 1
    };

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository) 
          return { validateMember: jest.fn().mockResolvedValue(void 0) };
        if (repo === OrderRepository)
          return { getDetailsById: jest.fn().mockResolvedValue(order) }
      });

      const result = await service.getOrder(emailInput, 1);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result).toEqual(order);

    })
  })

  /* 2. 주문 내역 조회하기 
 * 이메일을 통해 멤버를 검증한다. 
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
 * - 멤버가 존재하지 않으면 에러를 발생시킨다.  
 * 멤버 정보를 통해 주문 목록을 조회하고 페이징처리하여 반환한다.
 */
  describe('getOrders', () => {
    const member: Member = { id: 1, email: 'test@email.com' };
    const getOrdersInput: GetOrdersInput = {
      email: 'test@email.com',
      pageNumber: 1,
      pageSize: 1
    };
    const order1 = new Order;
    const order2 = new Order;
    const orders: Order[] = [order1, order2];
    const totalCount = 2;
    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository) 
          return { getByEmail: jest.fn().mockResolvedValue(member) };
      });
    
      const mockedQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([orders, totalCount]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn(() => mockedQueryBuilder),
      };

      jest.spyOn(queryRunner.manager, 'getRepository')
      .mockReturnValue(mockRepository as any);

      const result = await service.getOrders(getOrdersInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result[1]).toBe(totalCount);

    })
  })


});
