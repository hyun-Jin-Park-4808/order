import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { GetDeliveryMemosInput } from '../dto/get-delivery-memos.input.dto';
import { DeliveryMemo } from '../enitities/delivery-memo.entity';
import { DeliveryMemoRepository } from '../enitities/delivery-memo.repository';
import { DeliveryMemoQueryService } from '../service/delivery-memo.service.query';
import { BadRequestException } from '@nestjs/common';

describe('DeliveryMemoQueryService', () => {
  let service: DeliveryMemoQueryService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let deliveryMemos: DeliveryMemoRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryMemoRepository,
        DeliveryMemoQueryService, DeliveryMemoRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }],
    }).compile();

    service = module.get<DeliveryMemoQueryService>(DeliveryMemoQueryService);
    connection = module.get<Connection>(Connection);
    deliveryMemos = module.get<DeliveryMemoRepository>(DeliveryMemoRepository)

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
   * 1. 배송메모 목록 조회하기
   * 이메일을 통해 멤버를 찾아온다.
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 멤버에 해당하는 배송메모 목록을 페이징처리하여 반환한다. 
   */
  describe('getDeliveryMemos', () => {
    const member: Member = { id: 1, email: 'test@email.com' };
    const getDeliveryMemosInput: GetDeliveryMemosInput = {
      email: 'test@email.com',
      pageNumber: 1,
      pageSize: 1
    };
    const deliveryMemo1: DeliveryMemo = {
      id: 1, 
      memo: "집 앞에 놔주세요.",
      member: member
    };
    const deliveryMemo2: DeliveryMemo = {
      id: 2, 
      memo: "201호 앞에 놔주세요.",
      member: member
    };
    const deliveryMemos: DeliveryMemo[] = [deliveryMemo1, deliveryMemo2];
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
        getManyAndCount: jest.fn().mockResolvedValue([deliveryMemos, totalCount]),
      };

      const mockRepository = {
        createQueryBuilder: jest.fn(() => mockedQueryBuilder),
      };

      jest.spyOn(queryRunner.manager, 'getRepository')
      .mockReturnValue(mockRepository as any);

      const result = await service.getDeliveryMemos(getDeliveryMemosInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result[1]).toBe(totalCount);
    });
  })

    /**
   * 2. 최근 배송메모 조회하기
   * 이메일을 통해 멤버를 찾아온다.
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 최근 배송 메모를 조회한다.
   * - 최근 배송 메모가 없으면 에러를 발생시킨다. 
   */
    describe('getDeliveries', () => {
      const emailInput: EmailInput = { email: 'test@email.com' };
      const member: Member = { id: 1, email: emailInput.email };
      const deliveryMemo1: DeliveryMemo = {
        id: 1, 
        memo: "집 앞에 놔주세요.",
        member: member,
        updatedAt: new Date('2023-09-02T00:00:00Z')
      };
  
      it('성공 케이스', async () => {
        jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository) 
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === DeliveryMemoRepository)
            return { getRecentMemo: jest.fn().mockResolvedValue(deliveryMemo1) }
        });

        const result = await service.getRecentDeliveryMemo(emailInput);
  
        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(result).toEqual(deliveryMemo1);
      });

      it('최근 배송지가 없어 발생하는 실패 케이스', async () => {
        jest.spyOn(deliveryMemos, 'findOne').mockResolvedValue(null);
  
        await expect(deliveryMemos.getRecentMemo(member.id)).rejects
        .toThrow(
          new BadRequestException('Not a recent delivery memo for the logged in user, memberId: 1')
        );
      });
    })

});
