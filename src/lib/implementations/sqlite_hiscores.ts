import { Implementation, type Hiscores } from "$lib/do_not_modify/hiscores";
import { JumpPlayer } from "$lib/do_not_modify/player";
import { DefaultRank } from "$lib/do_not_modify/rank";
import type {
  GetLeaderboardsRequest,
  GetLeaderboardsResponse,
  CreateLeaderboardRequest,
  CreateLeaderboardResponse,
  DeleteLeaderboardRequest,
  DeleteLeaderboardResponse,
  GetScoresRequest,
  GetScoresResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
  GetRanksForPlayerRequest,
  GetRanksForPlayerResponse,
} from "$lib/do_not_modify/requests";
import { JumpScore } from "$lib/do_not_modify/score";

import 'colorts/lib/string';

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export class SQLiteHiscores implements Hiscores {
  implementation: Implementation = Implementation.SQLITE;

  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {

    console.log(("GetLeaderboardsResponse").magenta);

    const leaderboards = await prisma.leaderboard.findMany({
      select: {
        leaderboardId: true
      }
    })
    const response: GetLeaderboardsResponse = {
      success: true,
      leaderboards: leaderboards.map((e) => e.leaderboardId),
    };


    return response;
  }
  async create_leaderboard(
    request: CreateLeaderboardRequest
  ): Promise<CreateLeaderboardResponse> {

    console.log(("CreateLeaderboardRequest").magenta);

    const response: CreateLeaderboardResponse = {
      success: false,
    };
    //  prisma find or create
    let leaderboard = await prisma.leaderboard.upsert({
      where: {
        leaderboardId: request.leaderboard_id
      },
      update: {},
      create: {
        leaderboardId: request.leaderboard_id,
        saveMultiple:  request.save_multiple_scores_per_player
      }
    })
    // if found or created leaderboard has same id
    if ((leaderboard).leaderboardId === request.leaderboard_id) {
      console.log(("Created leaderboard " + request.leaderboard_id).green.bold)
      response.success = true
    }

    return response;
  }
  async delete_leaderboard(
    request: DeleteLeaderboardRequest
  ): Promise<DeleteLeaderboardResponse> {

    console.log(("DeleteLeaderboardRequest").magenta);

    const response: DeleteLeaderboardResponse = {
      success: false,
    };

    const leaderboard = await prisma.leaderboard.delete({
      where: {
        leaderboardId: request.leaderboard_id
      },
    })
    if (leaderboard) {
      console.log(("Leaderboard " + request.leaderboard_id + " deleted").red)
      response.success = true
    }

    return response;
  }
  async get_scores_from_leaderboard(
    request: GetScoresRequest
  ): Promise<GetScoresResponse> {

    console.log(("GetScoresRequest").magenta);

    const response: GetScoresResponse = {
      success: false,
      scores: [],
    }
    // get requested leaderboard
    const leaderboard = await prisma.leaderboard.findUniqueOrThrow({
      where: {
        leaderboardId: request.leaderboard_id
      },
      // include the related scores and sort them
      include: {
        scores: {
          orderBy: {
            value: 'desc',
          },
          // select the value and the userId, they will be included in the score
          select: {
            value: true,
            date: true,
            userId: true,
          },
        },
      },
    });
    // if the leaderboard exists and has scores
    if (leaderboard && leaderboard.scores.length > 0) {
      console.log(("Recieved Leaderboards with scores").green.bold)
      const scores = leaderboard.scores
      let responseScores = new Array
      // recreate the score and player class
      scores.forEach(score => {
        responseScores.push({
          value: score.value,
          date: score.date,
          player: {
            id: score.userId,
            power_level: 9000,
          },
        })
      })
      
      response.success = true
      response.scores = responseScores
    } else {
      console.log(("Recieveing Leaderboards failed").red)
    }
    return response
  }
  async submit_score_to_leaderboard(
    request: SubmitScoreRequest
  ): Promise<SubmitScoreResponse> {

    console.log(("SubmitScoreRequest").magenta);

    // function to return the new index of submitted / updated score
    async function getUpdatedIndex(leaderboardId:string, userId:string):Promise<number> {
      const leaderboard = await prisma.leaderboard.findUnique({
        where: {
          leaderboardId: leaderboardId
        },
        include: {
          scores: {
            orderBy: {
              value: 'desc'
            }
          }
        }
      });
      let i = -1
      if (leaderboard) {
        leaderboard.scores.forEach((score, index) => {
          if (score.userId === userId) {
            i = index
          } 
        })
      } 
      return i
    }

    // default response
    let response: SubmitScoreResponse = {
      success: false,
      rank: new DefaultRank(
        0,
        "",
        new JumpScore(0, new Date(), new JumpPlayer("", 0))
      ),
    };
    // get the right leaderboard with the scores sorted
    const leaderboard = await prisma.leaderboard.findUnique({
      where: {
        leaderboardId: request.leaderboard_id
      },
      include: {
        scores: {
          orderBy: {
            value: 'desc'
          }
        },
      }
    })
    // if that leaderboard exists
    if (leaderboard) {
      // if multiple scores will be saved
      if (leaderboard.saveMultiple) {
        // create new score
        await prisma.scores.create({
          data: {
            leaderboard: {
              connect: {
                  leaderboardId: request.leaderboard_id,
                }
            },
            userId: request.score.player.id,
            value: request.score.value,
            date: request.score.date,
          },
        })
        console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + leaderboard.leaderboardId).green.bold)
        // true response
        response.success = true
        response.rank = {
          index: await getUpdatedIndex(request.leaderboard_id, request.score.player.id),
          leaderboard_id: request.leaderboard_id,
          score: new JumpScore(request.score.value, request.score.date, request.score.player)
        };
      } else {
        const userScore = await prisma.scores.findFirst({
          where: {
            leaderboardId: request.leaderboard_id,
            userId: request.score.player.id,
          },
        })
        if (userScore) {
          console.log(("Score for " + request.score.player.id + " in leaderboard " + leaderboard.leaderboardId +" found").blue)
          if (userScore.value < request.score.value) {
            console.log(("User " + request.score.player.id + " has updated his score in leaderboard " + leaderboard.leaderboardId).green.bold);
            await prisma.scores.update({
              where: {
                id: userScore.id
              },
              data: {
                value: request.score.value,
                date: request.score.date,
              }
            })
            response.success = true
            response.rank = {
              index: await getUpdatedIndex(request.leaderboard_id, request.score.player.id),
              leaderboard_id: request.leaderboard_id,
              score: new JumpScore(request.score.value, request.score.date, request.score.player)
            };
          } else {
            console.log(("Submitted score for " + request.score.value + " is lower than " + userScore.value).red)
            response = {
              success: false,
              rank: new DefaultRank(
                -1,
                leaderboard.leaderboardId,
                new JumpScore(request.score.value, request.score.date, request.score.player)
              ),
            };
          }
        } else {
          console.log(("No score for " + request.score.player.id + " in leaderboard " + leaderboard.leaderboardId +" found, creating new one").yellow)
          await prisma.scores.create({
            data: {
              leaderboard: {
                connect: {
                    leaderboardId: request.leaderboard_id,
                  }
              },
              userId: request.score.player.id,
              value: request.score.value,
              date: request.score.date,
            }
          })
          console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + leaderboard.leaderboardId).green.bold)
          // true response
          response.success = true
          response.rank = {
            index: await getUpdatedIndex(request.leaderboard_id, request.score.player.id),
            leaderboard_id: request.leaderboard_id,
            score: new JumpScore(request.score.value, request.score.date, request.score.player)
          };
        }

      }
    }
    return response
  }
  async get_all_ranks_for_player(
    request: GetRanksForPlayerRequest
  ): Promise<GetRanksForPlayerResponse> {

    console.log(("GetRanksForPlayerRequest").magenta);

    const response: GetRanksForPlayerResponse = {
      success: false,
      ranks: [],
    };

    const leaderboards = await prisma.leaderboard.findMany({
      // include the related scores and sort them
      include: {
        scores: {
          orderBy: {
            value: 'desc',
          },
          // select the value and the userId, they will be included in the score
          select: {
            id: true,
            value: true,
            date: true,
            userId: true,
          },
        },
      },
    });

    leaderboards.forEach(leaderboard => {
      leaderboard.scores.forEach((score, index) => {
        if (score.userId == request.player_id) {
          console.log(("Score for user " + request.player_id + " in leaderboard " + leaderboard.id + " found").green)
          response.success = true
          response.ranks.push({
            index: index,
            leaderboard_id: leaderboard.leaderboardId,
            score: {
              value: score.value,
              date: score.date,
              player: {
                id: score.userId
              },
            },
          })

        }
      });
    });

    return response;
  }
}
