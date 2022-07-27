import {getBuffs, getReport, getTanks, getAttribute, getDeaths, getReduce, getDebuffs} from './blode.js';
import fs from 'fs';
import fetch from "node-fetch";
import DOMParser from 'dom-parser';

let parser = new DOMParser();
let encounterID = 725;
let PainSuppression = 33206;
let burn = 46394;

let phase = 0;
let items = {};
let itemKeys = [];
let finishKeys = [];

//拿到一个report就分析
let analyze = function(code){
    console.log("分析：" + code);
    phase = 1;
    items = {};
    itemKeys = [];
    getReport(code, encounterID).then(function(report){
    //列举所有fights(仅仅是布胖的725)
    let fights = report.reportData.report.fights;
    let serverName = report.reportData.report.rankedCharacters ? report.reportData.report.rankedCharacters[0].server.name : '--';
    let region = report.reportData.report.region.name;
    let startTime = report.reportData.report.startTime;
    let endTime = report.reportData.report.endTime;
    for(let fight of fights){
        //判定是否有熊T
        getTanks(code, fight.id, fight.startTime, fight.endTime).then(function(tanks) {
            let players = tanks.reportData.report.table.data.entries;
            let druidTanks = [];
            for(let player of players){
                if(player.icon == "Druid-Guardian" && player.total > 100000){
                    items[code + ":" + fight.id + ":" + player.id] = { code: code, region: region, startTime: startTime, endTime: endTime, id: fight.id, playerId: player.id, fightStartTime: fight.startTime, fightEndTime: fight.endTime, kill: fight.kill, serverName: serverName, playerName: player.name };
                    druidTanks.push(player);
                    itemKeys.push(code + ":" + fight.id + ":" + player.id)
                }
            }
            phase = 2;
            
            for(let player of druidTanks){
                //判定是否有压制
                getBuffs(code, fight.id, player.id, fight.startTime, fight.endTime).then(function(buffs){
                    let key = code + ":" + fight.id + ":" + player.id;
                    let auras = buffs.reportData.report.table.data.auras;
                    items[key]["pain"] = auras.filter(aura => aura.guid == PainSuppression).map(aura => aura.totalUses).reduce(function(prev, curr, idx, arr){
                        return prev + curr;
                    }, 0);

                    getDebuffs(code, fight.id, player.id, fight.startTime, fight.endTime).then(function(debuffs){
                        let auras = debuffs.reportData.report.table.data.auras;
                        items[key]["burn"] =  auras.filter(aura => aura.guid == burn).map(aura => aura.totalUses).reduce(function(prev, curr, idx, arr){
                            return prev + curr;
                        }, 0);

                        getAttribute(code, fight.id, player.id, fight.startTime, fight.endTime).then(function(attr){
                            let stats = attr.reportData.report.table.data.combatantInfo.stats;
                            if(stats.Stamina){
                                items[key]["stam"] = stats.Stamina.max;
                                items[key]["armor"] = stats.Armor.max;
                                items[key]["agili"] = stats.Agility.max;
                                items[key]["dodge"] = stats.Dodge.max;    
                            }else{
                                items[key]["stam"] = 0;
                                items[key]["armor"] = 0;
                                items[key]["agili"] = 0;
                                items[key]["dodge"] = 0;    
                            }

                            //获取死亡记录
                            getDeaths(code, fight.id, fight.startTime, fight.endTime).then(function(deaths){
                                let dies = deaths.reportData.report.table.data.entries;
                                let pos = dies.map(entry => entry.id).indexOf(player.id);
                                if(pos >= 0){
                                    items[key]["death"] = pos + 1;
                                    items[key]['deathTime'] = dies[pos]['timestamp'] - fight.startTime;
                                }else{
                                    items[key]["death"] = 0;
                                    items[key]['deathTime'] = 0;
                                }

                                //获取免伤记录
                                getReduce(code, fight.id, player.id, fight.startTime, fight.endTime).then(function(red){
                                    let redu = red.reportData.report.table.data.entries;
                                    if(redu.length > 0){
                                        items[key]["total"] = redu[0].total;
                                        items[key]["totalReduced"] = redu[0].totalReduced;
                                        items[key]["uses"] = redu[0].uses;
                                        items[key]["missCount"] = redu[0].missCount;
                                        finishKeys.push(key);
                                    }
                                });
                            });
                        });
                    });
                });
            }
        });
    }
}, function(reason){
    console.log("失败：" + reason);
    phase = 2;
})
};

let page = 0;
let findReports = function(){
    console.log("查找页：" + page);
    fetch("https://cn.classic.warcraftlogs.com/zone/reports?zone=1013&boss=725&difficulty=0&class=Druid&spec=Guardian&kills=0&duration=0&server=0&page=" + page, {
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-language": "zh-CN,zh;q=0.9",
          "sec-ch-ua": "\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "cookie": "__gads=ID=23a65a73f65191a7-220acae596d1008d:T=1649347256:RT=1649347256:S=ALNI_MZcoZ6Eqtl9ChTzwb30twFkJlJDgg; __qca=P0-533705270-1649347395755; remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6InBpcm9WTjlqQStLOU1iUDcyOVF0SlE9PSIsInZhbHVlIjoiUjFvZTQzLzFzM2lUZ0o3cDRGaDZ2eUJzWGZySTVGeFc3ZmhCdm1wYUgvaUZ6SHh1VUZaK2NyU203bzlCWXp4ekVQcjVqemRUM2YyMmNCU3dLcUdVQkYxdjBuY2hOMXNFMGI1R1FzQTBrMTdkQ3N4K1FHenAzbjZiZFBwQlJLVmRBajIzRHV1T3VleFh3eno3NWFydmxIRlRtRTlXTkZ3VTZRMnBpenREL0JOSk9MRkJ4ejVsNnpjS2Rvdm9JUyt4NjY1TmdNWEJjQ3haTWwwV050eUk3U2ltd3oyMmxjSjhrMGxHOWJkZUtxND0iLCJtYWMiOiI5NWQ0MDcyMTIxODQ1ZWExOGE0OTI3MjdlYzI5YjIyMDFiMGZlZmUzMzI2NjRiMTc4MDkwMTRkOWU1NzZlMDE0IiwidGFnIjoiIn0%3D; cookieconsent_status=dismiss; __gpi=UID=000005f7e3466e66:T=1653834796:RT=1658646709:S=ALNI_MbxiJ6xjLKbabceHy-OAYmrP1M8Ig; _gid=GA1.2.2030257030.1658646711; XSRF-TOKEN=eyJpdiI6IklLNmZUeDFOZWNrU2l4d2xWT2dGMmc9PSIsInZhbHVlIjoiYkIxRllXQlVlbUlDWHF2YnFud2RWcDhQdzY3cTRLdk1kUkpucUorN3lwRk14bFVIR0ltMWF1eXU1OUtITkF0UVNHTU41QnpSWmJMa29qNy9TOG5hOUVpbStuLy9GM0pRSTM2cXhIQ3dEZnk3WkE0SnQ3UXh6VmtNbU1FVU5ySnAiLCJtYWMiOiI2OGFlMDkxZGZmNjJjZTIzYmViNmQyMjlmZjExYzZkMzQ0MDU5Yjg3ZDA2OWNkNjVjNDdmMDhkOWY3ZjBiYjI0IiwidGFnIjoiIn0%3D; wcl_session=eyJpdiI6IkwxWElpbmRjZ3hOaEpXSzBIOGZwR0E9PSIsInZhbHVlIjoiZngrLzcrTm5rMnQrZGlmNEFVTkhoMDgrUlJiWWlMcko1a3VWOHNjZkRFVHB2VkhOY2lVNDRYNGxvYjkrSjhTSWU1c21mU2ErSklMVHRiQm5tbEJKaHJsSVYyOHdBM0Q5V21nQ0hyZE4vdnlCcDhqWUx4ci9Ja2U0eGcvbVlOMmUiLCJtYWMiOiJlNTE0NjM2Y2YxN2M1NzBlOTYyZjZmYjI5MDY0NmNjNTY4MzZjNGQyODUxMGU1NmM4ODViZTdmMmUzYTFhYjc3IiwidGFnIjoiIn0%3D; _ga_6XY6T4V8FD=GS1.1.1658663097.10.1.1658663268.0; _ga=GA1.1.1922791175.1649347256; _ga_LBDZ60DYZV=GS1.1.1658663097.4.1.1658663268.0",
          "Referer": "https://cn.classic.warcraftlogs.com/zone/reports?zone=1013&boss=725",
          "Referrer-Policy": "no-referrer-when-downgrade"
        },
        "body": null,
        "method": "GET"
      }).then(response => response.text())
        .then(function(body){
        let oldContent = fs.readFileSync('reports.csv', 'utf-8').split("\n").map(c => c.trim()).filter(d => d.length == 16);
          let content = [];
          let pageLength = 0;
          let doc = parser.parseFromString(body, "text/html");
          for(let cell of doc.getElementsByClassName("description-cell")){
              for(let link of cell.getElementsByTagName("a")){
                let href = link.getAttribute("href");
                if(href.includes("/reports/")){
                    let code = href.substring(href.lastIndexOf("/") + 1);
                    pageLength++;
                    if(oldContent.indexOf(code) < 0){
                        content.push(code);
                    }
                }
              }
          }

        fs.appendFileSync("reports.csv", "\r\n" + content.join("\r\n"));
        if(pageLength >= 100){
            page++;
            setTimeout(() => {
                findReports();                
            }, 1000);
        }else{
            page = 0;
        }
      });
}

let startOrder = 0;
let playerOrder = 0;
let startOrderOffset = 0;
let codes = [];
let delay = 500;
let fetched = new Date().getTime();
let startRun = function(){
    //分为三种情况：还未完成、已经完成、正在进行
    if(phase >= 2 && finishKeys.length == itemKeys.length){ //已完成
        for(let key of itemKeys){
            playerOrder++;
            //序号,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,战斗地址
            let fightUrl = `https://cn.classic.warcraftlogs.com/reports/${items[key]['code']}/#fight=${items[key]['id']}&type=summary&source=${items[key]['playerId']}`;
            let output = `${playerOrder},${startOrder + 1 + startOrderOffset},${items[key]['region']},${items[key]['startTime']},${items[key]['endTime']},${items[key]['fightStartTime']},${items[key]['fightEndTime']},${items[key]['code']},${items[key]['id']},${items[key]['playerId']},${items[key]['kill']},${items[key]['serverName']},${items[key]['playerName']},${items[key]['pain']},${items[key]['burn']},${items[key]['stam']},${items[key]['armor']},${items[key]['agili']},${items[key]['dodge']},${items[key]['death']},${items[key]['deathTime']},${items[key]['total']},${items[key]['totalReduced']},${items[key]['uses']},${items[key]['missCount']},${fightUrl}`;
            console.log(output);
            fs.appendFileSync("data.csv", output + "\r\n");
        }

        fetched = new Date().getTime();
        startOrder++;
        items = {};
        itemKeys = [];
        finishKeys = [];
        phase = 0;
    }else if(phase == 0){ //还未开始
        let code = codes[startOrder];
        if(code){
            analyze(code);
        }else{ // code跑完了
            if(page == 0){//新的report结束了或者未开始
                fetched = new Date().getTime();
                let lines = fs.readFileSync('data.csv', 'utf-8').split("\n").filter(c => c.length > 5);
                let oldCodes = lines.map(c => c.split(",")[7]);
                codes = Array.from(new Set(fs.readFileSync('reports.csv', 'utf-8').split("\n").map(c => c.trim()).filter(d => d.length == 16 && oldCodes.indexOf(d) == -1)));
                if(codes.length > 0){
                    if(lines.length > 1){
                        let lastLine = lines[lines.length - 1].split(",");
                        startOrderOffset = parseInt(lastLine[1]);
                        playerOrder = parseInt(lastLine[0]);
                    }
    
                    console.log("共" + codes.length + "个code，起始点" + startOrder + "，起始点偏移" + startOrderOffset + "，玩家点" + playerOrder);
                    startOrder = 0;
                }else{
                    delay = 60 * 1000;
                    page = 1;
                    findReports();    
                }
            }
        }
    }
    
    let cost = new Date().getTime() - fetched;
    console.log("本轮目前耗时：" + cost/1000 + "秒")
    if(cost > 20 * 60 * 1000){
        console.log("程序卡死")
        process.exit(1);
    }

    setTimeout(() => {
        startRun();
    }, delay);
}

page = 1;
findReports();//查看最新的codes

startRun();