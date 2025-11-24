export class CreateGameAnswerDomainDto {
  gameQuestionId: string;
  playerId: string;
  answer: string;
  isCorrect: boolean;
}
