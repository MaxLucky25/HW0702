import { PairGame } from '../../domain/entities/pair-game.entity';
import { PlayerProgressViewDto } from './player-progress.view-dto';
import { GameStatus } from '../../domain/dto/game-status.enum';

export class PairGameViewDto {
  id: string;
  firstPlayerProgress: PlayerProgressViewDto;
  secondPlayerProgress: PlayerProgressViewDto | null;
  questions: Array<{ id: string; body: string }> | null;
  status: GameStatus;
  pairCreatedDate: string;
  startGameDate: string | null;
  finishGameDate: string | null;

  static mapToView(game: PairGame): PairGameViewDto {
    const firstPlayer = game.getFirstPlayer();
    const secondPlayer = game.getSecondPlayer();

    const isPending = game.isPendingSecondPlayer();

    return {
      id: game.id,
      firstPlayerProgress: PlayerProgressViewDto.mapToView(firstPlayer!),
      secondPlayerProgress: isPending
        ? null
        : PlayerProgressViewDto.mapToView(secondPlayer!),
      questions: isPending
        ? null
        : game.questions
            .sort((a, b) => a.order - b.order)
            .map((gq) => ({
              id: gq.question.id,
              body: gq.question.body,
            })),
      status: game.status,
      pairCreatedDate: game.createdAt.toISOString(),
      startGameDate: game.startGameDate?.toISOString() ?? null,
      finishGameDate: game.finishGameDate?.toISOString() ?? null,
    };
  }
}
