import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailsController } from './thumbnails.controller';

describe('ThumbnailsController', () => {
  let controller: ThumbnailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThumbnailsController],
    }).compile();

    controller = module.get<ThumbnailsController>(ThumbnailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
