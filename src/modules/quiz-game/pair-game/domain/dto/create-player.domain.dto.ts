import { PlayerRole } from './player-role.enum';

export class CreatePlayerDomainDto {
  gameId: string;
  userId: string;
  role: PlayerRole;
}
