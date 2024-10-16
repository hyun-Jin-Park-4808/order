import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryQueryService } from '../service/delivery.service.query';
import { Connection, QueryRunner } from 'typeorm';
import { DeliveryRepository } from '../entities/delivery.repository';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Delivery } from '../entities/delivery.entity';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { BadRequestException } from '@nestjs/common';
import { GetDeliveriesInput } from '../dto/get-deliveries.input.dto';

describe('DeliveryQueryService', () => {
  let service: DeliveryQueryService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let deliveries: DeliveryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryQueryService, DeliveryRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }],
    }).compile();

    service = module.get<DeliveryQueryService>(DeliveryQueryService);
    connection = module.get<Connection>(Connection);
    deliveries = module.get<DeliveryRepository>(DeliveryRepository)

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

  /**
   * 1. 기본 배송지 조회하기
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 기본 배송지 정보를 찾아온다. 
   * - 기본 배송지가 없는 경우, 기본 배송지가 없다는 에러를 발생시킨다. 
   */
  describe('getDefaultDelivery', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = { id: 1, email: emailInput.email };
    const defaultDelivery: Delivery = {
      customerName: 'name',
      phoneNumber: '010-1234-5578',
      address: '서울시 송파구 석촌동 13, 201호',
      member: member,
      isDefault: true,
      id: 1
    };

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return { getByEmail: jest.fn().mockResolvedValue(member) };
        if (repo === DeliveryRepository)
          return { getDefaultByMemberId: jest.fn().mockResolvedValue(defaultDelivery) };
      });

      const result = await service.getDefaultDelivery(emailInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.isDefault).toEqual(true);
    });

    it('기본 배송지가 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(deliveries, 'findOne').mockResolvedValue(null);

      await expect(deliveries.getDefaultByMemberId(member.id)).rejects
      .toThrow(
        new BadRequestException('Not found default delivery, memberId: 1')
      );
    });
  })

  /**
   * 2. 배송지 목록 조회하기
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 멤버에 해당하는 배송지 목록을 페이징처리하여 반환한다.
   */
  describe('getDeliveries', () => {
    const member: Member = { id: 1, email: 'test@email.com' };
    const getDeliveriesInput: GetDeliveriesInput = {
      email: 'test@email.com',
      pageNumber: 1,
      pageSize: 1
    };
    const delivery1: Delivery = {
      id: 1, customerName: "name", 
      phoneNumber: "010-1234-5678", 
      address: "서울시 송파구 석촌동 13, 201호",
      isDefault: true,
      member: member
    };
    const delivery2: Delivery = {
      id: 2, customerName: "name", 
      phoneNumber: "010-4444-5678", 
      address: "서울시 송파구 석촌동 20, 203호",
      isDefault: false,
      member: member
    };
    const deliveries: Delivery[] = [delivery1, delivery2];
    const totalCount = 2;

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository) 
          return { getByEmail: jest.fn().mockResolvedValue(member) };
      });
    
      const mockedQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([deliveries, totalCount]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn(() => mockedQueryBuilder),
      };

      jest.spyOn(queryRunner.manager, 'getRepository')
      .mockReturnValue(mockRepository as any);

      const result = await service.getDeliveries(getDeliveriesInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result[1]).toBe(totalCount);
    });
  })
});
