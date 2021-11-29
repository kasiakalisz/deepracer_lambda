const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json"
  };
  try {
    switch (event.routeKey) {
      case "GET /health":
        statusCode=200;
        body='{"message":"HealthCheck successfull"}';
        break;
      case "POST /leagues":
           let requestJson = JSON.parse(event.body);
        await dynamo
          .put({
            TableName: "leagues",
            Item: {
              leagueName: requestJson.leagueName.toLowerCase()
            }
          })
         .promise();
        body = `League information saved for : ${requestJson.leagueName.toLowerCase()}`;
        break;
     
      case "GET /leagues":
        body = await dynamo
          .scan({
            TableName: "leagues"
          })
          .promise();
        break;
      case "PUT /tracks":
        let requestJsonT = JSON.parse(event.body);
        await dynamo
          .put({
            TableName: "tracks",
            Item: {
              trackName: requestJsonT.trackName.toLowerCase()
            }
          })
         .promise();
        body = `Track information saved for : ${requestJsonT.trackName.toLowerCase()}`;
        break;
      case "GET /tracks":
        body = await dynamo
          .scan({
            TableName: "tracks"
          })
          .promise();
        break;
      case "GET /leaderboard/league/{leagueName}":
         let lgname = event.pathParameters.leagueName;
         body = await dynamo
          .query({
            TableName: "deepracer-prod",
            IndexName: "league-index",
            ProjectionExpression: "#nm, surname, bestLap",
            KeyConditionExpression: "league = :leagueNames",
              ExpressionAttributeNames:{
                "#nm": "name"
            },
            ExpressionAttributeValues: {
              ":leagueNames": lgname
          }
          }).promise();
        break;
      case "GET /leaderboard/track/{trackName}":
             let trName = event.pathParameters.trackName;
         body = await dynamo
          .query({
            TableName: "deepracer-prod",
            IndexName: "track-index",
            ProjectionExpression: "#nm, surname, bestLap",
            KeyConditionExpression: "track = :trackNames",
              ExpressionAttributeNames:{
                "#nm": "name"
            },
            ExpressionAttributeValues: {
              ":trackNames": trName
          }
          })
          .promise();
        break;
      case "DELETE /participants/{id}":
        await dynamo
          .delete({
            TableName: "deepracer-prod",
            Key: {
              id: event.pathParameters.id
            }
          })
          .promise();
        body = `Deleted item ${event.pathParameters.id}`;
        break;
      case "GET /participants/{id}":
        body = await dynamo
          .get({
            TableName: "deepracer-prod",
            Key: {
              id: event.pathParameters.id
            }
          })
          .promise();
        break;
      case "GET /participants":
        body = await dynamo.scan({ TableName: "deepracer-prod" }).promise();
        break;
      case "POST /participants/lap":
        
        let jsonP = JSON.parse(event.body);
        let id=jsonP.email+":"+jsonP.league.toLowerCase() +":"+jsonP.track.toLowerCase();
        let participantD = await dynamo.get({
              TableName:"deepracer-prod",
              Key:{
                  "id": id
                }
            }).promise();
        let size = 0;
        let participantJson = participantD.Item;
        if(participantJson.laps != null){
         size = participantJson.laps.length;
        }
        let newJson = [{ 
          "lap": size + 1,
          "timeinMillis": jsonP.timeinMillis
        }];
        
        let newLaps = participantJson.laps.concat(newJson);
        let bestLap = Math.min.apply(Math, newLaps.map(function(o) { return o.timeinMillis; }));
        await dynamo
          .put({
            TableName: "deepracer-prod",
            Item: {
              id: id,
              email: participantJson.email,
              surname: participantJson.surname,
              name: participantJson.name,
              league: participantJson.league,
              jobtitle: participantJson.jobtitle,
              company: participantJson.company,
              track: participantJson.track,
              laps: newLaps,
              bestLap: bestLap
            }
          })
         .promise();
         body = participantJson;
        break;
      case "PUT /participants":
        let requestJSON = JSON.parse(event.body);
        let id2=requestJSON.email+":"+requestJSON.league.toLowerCase() +":"+requestJSON.track.toLowerCase();
        await dynamo
          .put({
            TableName: "deepracer-prod",
            Item: {
              id:id2,
              email: requestJSON.email,
              surname: requestJSON.surname,
              name: requestJSON.name,
              league: requestJSON.league.toLowerCase(),
              jobtitle: requestJSON.jobtitle,
              company: requestJSON.company,
              track: requestJSON.track.toLowerCase(),
              laps:[]
            }
          })
         .promise();
        body = `Participant information saved for : ${id}`;
        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers
  };
};
