import { Implementation, type Hiscores } from "$lib/do_not_modify/hiscores";
import type { Leaderboard } from "$lib/do_not_modify/leaderboard";
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
import { JumpScore, type Score } from "$lib/do_not_modify/score";

import 'colorts/lib/string';

// LEADERBOARD IS REPRESENTED AS A MAP OF KEY - VALUE PAIRS
// THE KEY IS THE LEADERBOARD_ID, THE VALUE IS THE LEADERBOARD ITSELF
// WE CAN LATER USE SET/GET/DELETE TO CREATE/READ/DELETE LEADERBOARDS
// WE CAN GET THE LEADERBOARD TO GET THE SCORES AND UPDATE THE SCORES
let leaderboards: Map<string, Leaderboard & {save: boolean}> = new Map();

export class InMemoryHiscores implements Hiscores {
  implementation: Implementation = Implementation.INMEMORY;
  
  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {

    const response: GetLeaderboardsResponse = {
      success: true,
      leaderboards: [...leaderboards.keys()],
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

    if(leaderboards.has(request.leaderboard_id)){
      console.log(("Leaderboard already exists").red)
    } {
      leaderboards.set(request.leaderboard_id, {
        id: request.leaderboard_id,
        scores: [],
        save: request.save_multiple_scores_per_player
      })
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

    if(leaderboards.has(request.leaderboard_id)){
      leaderboards.delete(request.leaderboard_id)
      console.log(("Leaderboard " + request.leaderboard_id + " deleted").red)
      response.success = true
    }

    return response;
  }
  async get_scores_from_leaderboard(
    request: GetScoresRequest
  ): Promise<GetScoresResponse> {

    console.log(("GetScoresRequest").magenta);

    let scores: Score[];
    const response: GetScoresResponse = {
      success: false,
      scores: [],
    };

    if(leaderboards.has(request.leaderboard_id)){
      const userLeaderboard = leaderboards.get(request.leaderboard_id)!
      let userScores = [...userLeaderboard.scores]
      if(userScores) {
        scores = userScores.splice(request.start_index, request.end_index)
        response.success = true
        response.scores = scores
        console.log(("Recieved Leaderboards with scores").green.bold)
      } else {
        console.log(("Recieveing Leaderboards failed").red)
      }
    } else {
      console.log(("Recieveing Leaderboards failed").red)
    }


    return response;
  }
  async submit_score_to_leaderboard(
    request: SubmitScoreRequest
  ): Promise<SubmitScoreResponse> {
    console.log(("SubmitScoreRequest").magenta);

    const response: SubmitScoreResponse = {
      success: false,
      rank: new DefaultRank(
        0,
        request.leaderboard_id,
        new JumpScore(request.score.value, request.score.date, request.score.player)
        ),
    };

    if(leaderboards.has(request.leaderboard_id)){
      const userLeaderboard = leaderboards.get(request.leaderboard_id)!
      let save = userLeaderboard.save
      // function to sort the scores
      function sortScores() {
        userLeaderboard.scores.sort((a, b)=> a.value - b.value);
        userLeaderboard.scores.reverse()
        return userLeaderboard;
      }
      if (userLeaderboard.scores.length < 1 || save == true) {
        // if leaderboard is empty or save multiple, push score to leaderboard
        userLeaderboard.scores.push(request.score)
        console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + userLeaderboard.id).green.bold)
        sortScores()
        // find new index
        let resIndex = 0
        userLeaderboard.scores.forEach((score, index) => {
          if (score.player.id === request.score.player.id) {
            resIndex = index
          }
        })
        response.success = true
        response.rank = {
          index: resIndex,
          leaderboard_id: request.leaderboard_id,
          score: new JumpScore(request.score.value, request.score.date, request.score.player)
        }
      } else {
        let create = true
        // get all scores from leaderboard that is not save multiple
        userLeaderboard.scores.forEach((score, index) => {
          // search if user has a score in the leaderboard
          if (score.player.id === request.score.player.id) {
            create = false
            console.log(("Score for " + request.score.player.id + " in leaderboard " + userLeaderboard.id +" found").blue)
            // if submitted score is higher than score in leaderboard
            if (score.value < request.score.value) {
              console.log(("User " + request.score.player.id + " has updated his score in leaderboard " + userLeaderboard.id).green.bold)
              // replace score
              userLeaderboard.scores.splice(index, 1, request.score)
              sortScores()
              // find new index
              let resIndex = 0
              userLeaderboard.scores.forEach((score, index) => {
                if (score.player.id === request.score.player.id) {
                  resIndex = index
                }
              })
              response.success = true
              response.rank = {
                index: resIndex,
                leaderboard_id: request.leaderboard_id,
                score: new JumpScore(request.score.value, request.score.date, request.score.player)
              }
            } else {
              console.log(("Submitted score for " + request.score.value + " is lower than " + score.value).red)
            }
          }
        });
        // if user has no score in leaderboard - add the submitted score
        if (create) {
          console.log(("No score for " + request.score.player.id + " in leaderboard " + userLeaderboard.id +" found, creating new one").yellow)
          console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + userLeaderboard.id).green.bold)
          userLeaderboard.scores.push(request.score)
          sortScores()
          // find new index
          let resIndex = 0
          userLeaderboard.scores.forEach((score, index) => {
            if (score.player.id === request.score.player.id) {
              resIndex = index
            }
          })
          response.success = true
          response.rank = {
            index: resIndex,
            leaderboard_id: request.leaderboard_id,
            score: new JumpScore(request.score.value, request.score.date, request.score.player)
          }
        }
      }
    }

    return response;
  }
  async get_all_ranks_for_player(
    request: GetRanksForPlayerRequest
  ): Promise<GetRanksForPlayerResponse> {
    console.log(("GetRanksForPlayerRequest").magenta);

    const response: GetRanksForPlayerResponse = {
      success: false,
      ranks: []
    };

    leaderboards.forEach(leaderboard => {
      leaderboard.scores.forEach((score,index) => {
        if (score.player.id === request.player_id) {
          console.log(("Score for user " + request.player_id + " in leaderboard " + leaderboard.id + " found").green)
          response.success = true
          response.ranks.push({
            index: index,
            leaderboard_id: leaderboard.id,
            score: score
          })
        }
      })
    });

    return response;
  }
}
