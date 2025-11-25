export class UserStatisticViewDto {
  sumScore: number;
  avgScores: number;
  gamesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;

  static mapToView(data: {
    sumScore: number;
    avgScores: number;
    gamesCount: number;
    winsCount: number;
    lossesCount: number;
    drawsCount: number;
  }): UserStatisticViewDto {
    return {
      sumScore: data.sumScore,
      avgScores: data.avgScores,
      gamesCount: data.gamesCount,
      winsCount: data.winsCount,
      lossesCount: data.lossesCount,
      drawsCount: data.drawsCount,
    };
  }
}
