import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { DeliveryMemoInput } from '../dto/delivery-memo.input.dto';
import { DeliveryMemo } from '../enitities/delivery-memo.entity';
import { DeliveryMemoRepository } from '../enitities/delivery-memo.repository';
import { DeliveryMemoCommandService } from '../service/delivery-memo.service.command';
import { BadRequestException } from '@nestjs/common';

describe('DeliveryMemoCommandService', () => {
  let service: DeliveryMemoCommandService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let deliveryMemos: DeliveryMemoRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryMemoCommandService, DeliveryMemoRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }],
    }).compile();

    service = module.get<DeliveryMemoCommandService>(DeliveryMemoCommandService);
    connection = module.get<Connection>(Connection);
    deliveryMemos = module.get<DeliveryMemoRepository>(DeliveryMemoRepository);

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

  afterEach(() => {
    jest.clearAllMocks();
  })

  /**
   * 1. 배송메모 저장하기 
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 멤버의 정보와 input으로 들어온 배송메모 정보를 저장한다. 
   */
  describe('saveDeliveryMemo', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = { id: 1, email: emailInput.email };
    const deliveryMemoInput: DeliveryMemoInput = {
      memo: '문 앞에 놓아주세요.'
    };
    const deliveryMemo: DeliveryMemo = {
      memo: deliveryMemoInput.memo,
      member: member,
      id: 1
    };

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
      .mockImplementation((repo) => {
        if (repo === MemberRepository)
          return { getByEmail: jest.fn().mockResolvedValue(member) };
        if (repo === DeliveryMemoRepository)
          return { save: jest.fn().mockResolvedValue(deliveryMemo) }
      });

      const result = await service.saveDeliveryMemo(emailInput, deliveryMemoInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result).toEqual(deliveryMemo);
    })
  })

    /**
   * 2. 배송메모 삭제하기 
   * 이메일을 통해 멤버를 찾아온다. 
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 배송메모를 삭제한다. 
   * - member와 배송메모 id와 매칭되는 배송메모가 존재하지 않으면 에러를 발생시킨다.  
   */
    describe('deleteDeliveryMemo', () => {
      const emailInput: EmailInput = { email: 'test@email.com' };
      const member: Member = { id: 1, email: emailInput.email };
      const deliveryMemo: DeliveryMemo = {
        memo: '문 앞에 놓아주세요.',
        member: member,
        id: 1
      };
  
      it('성공 케이스', async () => {
        jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === DeliveryMemoRepository)
            return { deleteMemo: jest.fn().mockResolvedValue(void 0) }
        });
  
        await service.deleteDeliveryMemo(emailInput, deliveryMemo.id);
  
        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      })

      it('멤버 정보와 배송 메모 id가 일치하지 않아 발생하는 실패 케이스', async () => {
        jest.spyOn(deliveryMemos, 'findOne').mockResolvedValue(null);

        await expect(deliveryMemos.deleteMemo(member.id, deliveryMemo.id)).rejects
        .toThrow(
          new BadRequestException('Not a delivery memo for the logged in user, memberId: 1')
        );
      });

    })
});
