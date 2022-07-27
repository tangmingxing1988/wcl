import {gql, GraphQLClient} from 'graphql-request';

let test = false;
let token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NmNmNzU3Ny02ODZhLTRmMjEtYTE3NS0zOTU1MDQ2OTNmMWIiLCJqdGkiOiIxMjhjNzZhNTExNWZmNjUxZjc3YzljYjI4ODkzYjkyNmUzMjllNjQzNWFhYzM1Mzc4ODc5N2RkYjdmMzcwNjhiMzIzYjk5YzQyMDg1YWYwZiIsImlhdCI6MTY1ODE3NzgwOS41ODk0NDcsIm5iZiI6MTY1ODE3NzgwOS41ODk0NSwiZXhwIjoxNjg5MjgxODA5LjU4NDYyNCwic3ViIjoiIiwic2NvcGVzIjpbInZpZXctdXNlci1wcm9maWxlIiwidmlldy1wcml2YXRlLXJlcG9ydHMiXX0.S99hZA8RW4JGMdq7pgdo3XaOpx_79SN1TnqoBHyBCXUZUmkVxvmu460kkmbQFPQ6rVn2iWbzD-Jy7_l2e6DiDXuhXbK2ZNQlwbGZjyxsZdhmfoFiaen2YpXAuUregHJPPrZC14k3eUw8_gaO0U9Svyr809W54BIq9-ZywUU2eM1k8IL3Am04pwKwuJtVN9PRP2CcLtvvmoCCG_rhWtDQBToAo5rO_UNjjSfya9B7S8FL_Vitar9W9IYgJpv7T1JdAWVCZ5auaCNnjdyuAURtNMuTseCXcGwk1BMDmyraVNUbd74OWyWGsNonnaRFnd54Drq-rVbkxt0TbySXA7-o_wCJqe_lYlMSR2sOFUuHDhbgSGsuRagRYkjO66sEWRgtNTkzbFeaRrVDqguB11KPkJOC-yTzmPrbjwUAOoXLuTB8zDq17m-T8n7YkO-9LHN4vi-hEtlfwKrZ-tlKdHqxpiPQj4kCzj0xLQnobKm3X2V_tfL6s4sMQvxclYbptGE9UQ8f_Ln1oJY1Mt6U2vBYjc9O81LV9rnhT9GifTfy9I57b9JsO9wXh4V3xGDXoKcXZADPnXtzncK6VtATo2tb_l9V3aRH5DXwE4tUdhS-Clv4UmG6FzXYJmjMvUAsPMAbX9xug-SxCvns2SsD7Cpkij3rXFCFRV0Z7sJdEcLoHDY"
//96cf7577-686a-4f21-a175-395504693f1b and the client secret is . 
//96cf7577-686a-4f21-a175-395504693f1b:u7APATsPo17NxqG574v0gKtMvaoXmrO51QiuCB2L
//
let startQuery = 0;
let queryCount = 0;
const rate = function(){
  if(startQuery == 0){
    startQuery = new Date().getTime();
  }

  queryCount++;
  while(queryCount > (new Date().getTime() - startQuery) / 1000 * 9.8){
  }
  if(queryCount % 100 == 0){
    console.log("[" + new Date().toLocaleString() + "]" + queryCount + "次，历时" + (new Date().getTime() - startQuery) / 1000 + "秒");
  }
};

export const getReports = async (page) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';

  const query = gql`
  {
    reportData {
      reports(zoneID: 1013, page: ${page}, limit: 100) {
				current_page
				last_page
				per_page
				from
				to
				total
				
				data {
					code
					startTime
					endTime
				}
			}
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}});
  
  rate();
  return client.request(query)
}

export const getReport = async (code, encounterID) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';

  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
				guild {
					faction {
						id
						name
					}
				}
				startTime
				endTime
				region {
					name
				}
        rankedCharacters{
					server{
						name
					}
				}
        fights (encounterID: ${encounterID}) {
          id
          name
          difficulty
          kill
          fightPercentage
          startTime
          endTime
        }
      }
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return client.request(query)
}

export const getReportEvents = async (code, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        graph(startTime: ${startTime}, endTime: ${endTime}, dataType: DamageTaken, viewBy: Ability)
      }
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getTanks = async (code, fightID, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: DamageDone, viewBy: Target, hostilityType: Enemies, sourceClass: "Boss")
      }
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getBuffs = async (code, fightID, sourceID, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: Buffs, viewBy: Source, hostilityType: Friendlies, sourceID: ${sourceID})
      }
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getAllBuffs = async (code, fightID, startTime, endTime, log = false) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: Buffs, viewBy: Source, hostilityType: Friendlies)
      }
    }
  }`;

  if(test || log){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}


export const getDebuffs = async (code, fightID, sourceID, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: Debuffs, viewBy: Source, hostilityType: Friendlies, sourceID: ${sourceID})
      }
    }
  }`;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getAttribute = async (code, fightID, sourceID, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`

  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: Summary, sourceID:  ${sourceID})
      }
    }
  }
  `;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}


export const getDeaths = async (code, fightID, startTime, endTime) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`

  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: Deaths)
      }
    }
  }
  `;

  if(test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getReduce = async (code, fightID, sourceID, startTime, endTime, log = false) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`

  {
    reportData {
      report(code: "${code}") {
        code
        title
        table(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: DamageTaken, sourceID: ${sourceID}, viewOptions: 4098, abilityID: 1)
      }
    }
  }
  `;

  if(log || test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}

export const getReduceEvents = async (code, fightID, sourceID, startTime, endTime, log = false) => {
  const url = 'https://www.warcraftlogs.com/api/v2/client';
  const query = gql`
  {
    reportData {
      report(code: "${code}") {
        code
        title
        events(fightIDs: [${fightID}], startTime: ${startTime}, endTime: ${endTime}, dataType: DamageTaken, sourceID: ${sourceID}, includeResources: true, abilityID: 1){
					data
				}
      }
    }
  }
  `;

  if(log || test){
    console.log(query);
  }
  const client = new GraphQLClient(url, {headers: {'Authorization': `Bearer ${token}`}})
  
  rate();
  return await client.request(query)
}
