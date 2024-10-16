import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, QueryRunner } from 'typeorm';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Member } from '../../member/entities/member.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { DeliveryInput } from '../dto/delivery.input.dto';
import { ModifyDeliveryInput } from '../dto/modify-delivery.input.dto';
import { Delivery } from '../entities/delivery.entity';
import { DeliveryRepository } from '../entities/delivery.repository';
import { DeliveryCommandService } from '../service/delivery.service.command';

describe('DeliveryCommandService', () => {
  let service: DeliveryCommandService;
  let connection: Connection;
  let queryRunner: QueryRunner;
  let deliveries: DeliveryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryCommandService, DeliveryRepository,
        { provide: Connection, useValue: { createQueryRunner: jest.fn() } }],
    }).compile();

    service = module.get<DeliveryCommandService>(DeliveryCommandService);
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
      },
    } as any;

    (connection.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  /**
   * 1. 배송지 신규 입력하기 
   * 이메일을 통해 멤버를 찾아온다.
   * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
   * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
   * 기본 배송지로 선택했을 때, 기존에 저장된 기본 배송지가 있으면 isDefault를 false로 변경한다. 
   * 멤버의 정보와, input으로 들어온 배송지 정보를 저장한다. 
   */
  describe('addToDelivery', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = { id: 1, email: emailInput.email };
    const deliveryInput: DeliveryInput = {
      customerName: 'name',
      phoneNumber: '010-1234-5578',
      address: '서울시 송파구 석촌동 13, 201호'
    };
    const defaultDeliveryInput: DeliveryInput = {
      customerName: 'name',
      phoneNumber: '010-1234-5578',
      address: '서울시 송파구 석촌동 13, 201호',
      isDefault: true
    };
    const delivery: Delivery = {
      customerName: deliveryInput.customerName,
      phoneNumber: deliveryInput.phoneNumber,
      address: deliveryInput.address,
      member: member,
      id: 1
    };
    const modifiedDeliveryToDefault: Delivery = {
      customerName: deliveryInput.customerName,
      phoneNumber: deliveryInput.phoneNumber,
      address: deliveryInput.address,
      member: member,
      id: 1,
      isDefault: true
    };
    const defaultDelivery: Delivery = {
      customerName: deliveryInput.customerName,
      phoneNumber: deliveryInput.phoneNumber,
      address: deliveryInput.address,
      member: member,
      isDefault: true,
      id: 2
    };

    it('성공 케이스, isDefault = false인 경우', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === DeliveryRepository)
            return { save: jest.fn().mockResolvedValue(delivery) };
        });

      const result = await service.addToDelivery(emailInput, deliveryInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result).toEqual(delivery);
    });

    it('성공 케이스, isDefault = true인 경우', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === DeliveryRepository)
            return { save: jest.fn().mockResolvedValue(modifiedDeliveryToDefault),
                     changeDefaultDelivery: jest.fn().mockResolvedValue(void 0) };
        });

      jest.spyOn(deliveries, 'findOne').mockResolvedValue(defaultDelivery);
      jest.spyOn(deliveries, 'save').mockResolvedValue(defaultDelivery);

      await deliveries.changeDefaultDelivery(2);
      const result = await service.addToDelivery(emailInput, defaultDeliveryInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(defaultDelivery.isDefault).toEqual(false);
      expect(result).toEqual(modifiedDeliveryToDefault);
    });

  })

  /**
 * 2. 배송지 수정하기 
 * 이메일을 통해 멤버를 검증한다.
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
 * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
 * 배송지 id를 통해 배송지 정보를 찾아온다. 
 * - 배송지 정보가 존재하지 않으면 에러를 발생시킨다.
 * 기본 배송지로 수정할 때, 기존에 저장된 기본 배송지가 있으면 해당 배송지의 isDefault를 false로 변경한다.
 * - 장바구니 추가하기에도 같은 로직이 있으므로 테스트 코드는 패스한다.      
 * 배송지 정보를 수정한다. 
 */
  describe('modifyDelivery', () => {
    const emailInput: EmailInput = { email: 'test@email.com' };
    const member: Member = { id: 1, email: emailInput.email };
    const delivery: Delivery = {
      customerName: 'name',
      phoneNumber: '010-1234-5578',
      address: '서울시 송파구 석촌동 13, 201호',
      member: member,
      id: 1
    };
    const modifyDeliveryInput: ModifyDeliveryInput = {
      customerName: 'name',
      phoneNumber: '010-1234-1234',
      address: '서울시 송파구 석촌동 15'
    };

    it('성공 케이스', async () => {
      jest.spyOn(queryRunner.manager, 'getCustomRepository')
        .mockImplementation((repo) => {
          if (repo === MemberRepository)
            return { getByEmail: jest.fn().mockResolvedValue(member) };
          if (repo === DeliveryRepository)
            return {
              getById: jest.fn().mockResolvedValue(delivery),
              save: jest.fn().mockResolvedValue(delivery)
            };
        });

      const result = await service.modifyDelivery(delivery.id, emailInput, modifyDeliveryInput);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(result.phoneNumber).toEqual(modifyDeliveryInput.phoneNumber);
      expect(result.address).toEqual(modifyDeliveryInput.address);
    });

    it('배송지 정보가 존재하지 않아 발생하는 실패 케이스', async () => {
      jest.spyOn(deliveries, 'findOne').mockResolvedValue(null);
      
      await expect(deliveries.getById(delivery.id)).rejects
      .toThrow(
        new BadRequestException('Not found delivery, id: 1')
      );
    });
  })

    /**
 * 3. 배송지 삭제하기 
 * 이메일을 통해 멤버를 검증한다.
 * - 멤버가 인증되지 않았으면 에러를 발생시킨다.(공동 예외이므로 테스트 코드 패스)
 * - 멤버가 존재하지 않으면 에러를 발생시킨다. 
 * 배송지 정보를 삭제한다.
* - member와 배송지 id와 매칭되는 배송지가 존재하지 않았으면 에러를 발생시킨다. 
 */
    describe('deleteDelivery', () => {
      const emailInput: EmailInput = { email: 'test@email.com' };
      const member: Member = { id: 1, email: emailInput.email };
      const delivery: Delivery = {
        customerName: 'name',
        phoneNumber: '010-1234-5578',
        address: '서울시 송파구 석촌동 13, 201호',
        member: member,
        id: 1
      };
  
      it('성공 케이스', async () => {
        jest.spyOn(queryRunner.manager, 'getCustomRepository')
          .mockImplementation((repo) => {
            if (repo === MemberRepository)
              return { getByEmail: jest.fn().mockResolvedValue(member) };
            if (repo === DeliveryRepository)
              return {
                deleteDelivery: jest.fn().mockResolvedValue(void 0)
              };
          });

        await service.deleteDelivery(delivery.id, emailInput);
  
        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      });

      it('멤버 정보와 배송지 id가 일치하지 않아 발생하는 실패 케이스', async () => {
        jest.spyOn(deliveries, 'findOne').mockResolvedValue(null);

        await expect(deliveries.deleteDelivery(member.id, delivery.id)).rejects
        .toThrow(
          new BadRequestException('Not a delivery for the logged in user, memberId: 1')
        );
      });
    })

});

