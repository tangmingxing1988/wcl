import {getBuffs, getReport, getTanks, getAttribute, getDeaths, getReduce, getDebuffs} from './blode.js';
import fs from 'fs';

let codeStr = fs.readFileSync('reports.csv', 'utf-8');
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


let startOrder = 0;
let playerOrder = 0;
let startOrderOffset = 0;
let lines = fs.readFileSync('data.csv', 'utf-8').split("\r\n").filter(c => c.length > 5);
if(lines.length > 1){
    let lastLine = lines[lines.length - 1].split(",");
    startOrderOffset = parseInt(lastLine[1]);
    playerOrder = parseInt(lastLine[0]);
}
let oldCodes = fs.readFileSync('data.csv', 'utf-8').split("\r\n").map(c => c.split(",")[7]);
let codes = Array.from(new Set(codeStr.split("\r\n").map(c => c.trim()).filter(d => d.length == 16 && oldCodes.indexOf(d) == -1)));
console.log(codes.length + "个报告");
let startRun = function(){
    //分为两种情况：还未完成或已经完成
    if(phase >= 2 && finishKeys.length == itemKeys.length){ //已完成
        for(let key of itemKeys){
            playerOrder++;
            //序号,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,战斗地址
            let fightUrl = `https://cn.classic.warcraftlogs.com/reports/${items[key]['code']}/#fight=${items[key]['id']}&type=summary&source=${items[key]['playerId']}`;
            let output = `${playerOrder},${startOrder + 1 + startOrderOffset},${items[key]['region']},${items[key]['startTime']},${items[key]['endTime']},${items[key]['fightStartTime']},${items[key]['fightEndTime']},${items[key]['code']},${items[key]['id']},${items[key]['playerId']},${items[key]['kill']},${items[key]['serverName']},${items[key]['playerName']},${items[key]['pain']},${items[key]['burn']},${items[key]['stam']},${items[key]['armor']},${items[key]['agili']},${items[key]['dodge']},${items[key]['death']},${items[key]['deathTime']},${items[key]['total']},${items[key]['totalReduced']},${items[key]['uses']},${items[key]['missCount']},${fightUrl}`;
            console.log(output);
            fs.appendFileSync("data.csv", output + "\r\n");
        }

        startOrder++;
        items = {};
        itemKeys = [];
        finishKeys = [];
        phase = 0;
    }else if(phase == 0){ //还未开始
        analyze(codes[startOrder]);
    }
    setTimeout(() => {
        startRun();
    }, 2000);
}

analyze(codes[startOrder]);
startRun();