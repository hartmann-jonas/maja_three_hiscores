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
import { JumpScore, type Score } from "$lib/do_not_modify/score";
import { MongoClient } from "mongodb";

// Connection URI
const uri = "mongodb+srv://jonash:jonas@interfacehiscores.yeyor0z.mongodb.net/?retryWrites=true&w=majority";
// Create a new MongoClient
const client = new MongoClient(uri);

// database variables
// DO NOT CHANGE!
const databaseName: string = "test"
const collectionName: string = "leaderboards"

export class MongoDBHiscores implements Hiscores {
  implementation: Implementation = Implementation.MONGODB;

  async get_leaderboards(
    request: GetLeaderboardsRequest
  ): Promise<GetLeaderboardsResponse> {

    const response: GetLeaderboardsResponse = {
      success: false,
      leaderboards: [],
    };

    // TODO: 
    await client.connect();
    const leaderboards = await client.db(databaseName).collection(collectionName).find()
    const leaderboardArr = await leaderboards.toArray()
    if (leaderboardArr) {
      response.success = true
      response.leaderboards = leaderboardArr.map((e) => e.name)
    }
    return response;
  }
  async create_leaderboard(
    request: CreateLeaderboardRequest
  ): Promise<CreateLeaderboardResponse> {

    const response: CreateLeaderboardResponse = {
      success: false,
    };

    await client.connect();
    // mongodb find or create
    const result = await client.db(databaseName).collection(collectionName).findOneAndUpdate(
      { name: request.leaderboard_id },
      {
        $setOnInsert: {
          name: request.leaderboard_id,
          saveMultiple: request.save_multiple_scores_per_player,
          scores: []
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
      }
    );
    if (result.ok) {
      response.success = true
    }

    return response;
  }
  async delete_leaderboard(
    request: DeleteLeaderboardRequest
  ): Promise<DeleteLeaderboardResponse> {

    const response: DeleteLeaderboardResponse = {
      success: false,
    };

    await client.connect()
    const result = await client.db(databaseName).collection(collectionName).deleteOne({ name: request.leaderboard_id })
    console.log(result.deletedCount + " leaderboard with the name " + request.leaderboard_id + " was deleted")
    if (result.acknowledged) {
      response.success = true
    }
    return response;
  }
  async get_scores_from_leaderboard(
    request: GetScoresRequest
  ): Promise<GetScoresResponse> {

    let scores: Score[];
    const response: GetScoresResponse = {
      success: false,
      scores: [],
    };

    await client.connect();
    const leaderboard = await client.db(databaseName).collection(collectionName).findOne({name: request.leaderboard_id})
    if(leaderboard) {
    let userScores = [...leaderboard.scores]
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

    const response: SubmitScoreResponse = {
      success: false,
      rank: new DefaultRank(
        0,
        "ERROR",
        new JumpScore(request.score.value, request.score.date, request.score.player)
      ),
    };

    await client.connect()

    const leaderboard = await client.db(databaseName).collection(collectionName).findOne({name: request.leaderboard_id})
    if(leaderboard) {
      let save = leaderboard.saveMultiple
      // if save multiple is true
      if (leaderboard.scores.length < 1 || save == true) {
        // if leaderboard is empty or save multiple, push score to leaderboard
        // update scores in document
        await client.db(databaseName).collection(collectionName).updateOne(
          { name: request.leaderboard_id },
          { $push: { scores: request.score }}
        )
        // sort the array in the database
        await client.db(databaseName).collection(collectionName).updateOne(
          {name: request.leaderboard_id},
          { $push: { scores: {$each: [], $sort: -1 }}}
        )
        // get the updated document from the database
        let updatedLeaderboard = await client.db(databaseName).collection(collectionName).findOne({name: request.leaderboard_id})
        // find new index
        let resIndex = 0
        if (updatedLeaderboard) {
          updatedLeaderboard.scores.forEach((score: JumpScore, index: number) => {
            if (score.player.id === request.score.player.id) {
              resIndex = index
            }
          })
        }
        console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + request.leaderboard_id).green.bold)
        response.success = true
        response.rank = {
          index: resIndex,
          leaderboard_id: request.leaderboard_id,
          score: new JumpScore(request.score.value, request.score.date, request.score.player)
        }
      } else {
        let create = true
        for(const score of leaderboard.scores){
          // if user has a score in the leaderboard 
          if (score.player.id === request.score.player.id) {
            create = false
            console.log(("Score for " + request.score.player.id + " in leaderboard " + request.leaderboard_id +" found").blue)
            // if submitted score is higher than score in leaderboard
            if (score.value < request.score.value) {
              // replace score in document
              await client.db(databaseName).collection(collectionName).updateOne(
                { name: request.leaderboard_id, "scores.player": request.score.player },
                { $set: { "scores.$": request.score }},
              )
              console.log(("User " + request.score.player.id + " has updated his score in leaderboard " + request.leaderboard_id).green.bold)
              // get the updated document from the database
              let updatedLeaderboard = await client.db(databaseName).collection(collectionName).findOne({name: request.leaderboard_id})
              let resIndex = 0
              if (updatedLeaderboard) {
                updatedLeaderboard.scores.forEach((score: JumpScore, index: number) => {
                  if (score.player.id === request.score.player.id) {
                    resIndex = index
                  }
                })
              }
              response.success = true
              response.rank = {
                index: resIndex,
                leaderboard_id: request.leaderboard_id,
                score: new JumpScore(request.score.value, request.score.date, request.score.player)
              }
              console.log(response)
              
              return response
            } else {
              console.log(("Submitted score for " + request.score.value + " is lower than " + score.value).red)
            }
          }
        };
        if (create) {
          // update scores in document
        await client.db(databaseName).collection(collectionName).updateOne(
          { name: request.leaderboard_id },
          { $push: {scores: request.score}}
        )
        // sort the array in the database
        await client.db(databaseName).collection(collectionName).updateOne(
          {name: request.leaderboard_id},
          { $push: {
              scores: {
                $each: [],
                $sort: -1
          }}}
        )
        // get the updated document from the database
        let updatedLeaderboard = await client.db(databaseName).collection(collectionName).findOne({name: request.leaderboard_id})
        let resIndex = 0
        if (updatedLeaderboard) {
          updatedLeaderboard.scores.forEach((score: JumpScore, index: number) => {
            if (score.player.id === request.score.player.id) {
              resIndex = index
            }
          })
        }
        console.log(("User " + request.score.player.id + " has created a new score in leaderboard " + request.leaderboard_id).green.bold)
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

    const response: GetRanksForPlayerResponse = {
      success: false,
      ranks: [],
    };

    await client.connect()
    const leaderboards = await client.db(databaseName).collection(collectionName).find()
    await leaderboards.forEach(leaderboard => {
      console.log(leaderboard)
      leaderboard.scores.forEach((score: JumpScore, index: number) => {
        if (score.player.id === request.player_id) {
          console.log(("Score for user " + request.player_id + " in leaderboard " + leaderboard.name + " found").green)
          response.success = true
          response.ranks.push({
            index: index,
            leaderboard_id: leaderboard.name,
            score: score
          })
        }
      })
    })

    return response;
  }
}
