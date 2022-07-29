import { setLog, getBuffs, getReport, getTanks, getAttribute, getDeaths, getReduce, getDebuffs, getAllBuffs, getReduceEvents } from './api.js';
import fs from 'fs';
import fetch from "node-fetch";
import DOMParser from 'dom-parser';

let testCode = "";
let testFights = [];
setLog(testCode);
let parser = new DOMParser();
let encounterID = 725;
let bossID = 24882;
let PainSuppression = 33206;
let burn = 46394;
let stomp = 45185;
let allianceBuffs = [28880, 20594, 20589];
let hordeBuffs = [7744, 26297, 20577, 20572, 33697, 33702];
let layOnHands = [633, 2800, 10310, 27154, 20233, 20236, 9257];

//代表解析结果
let items = {};
let itemKeys = [];

//为了防止重复解析和及时写入结果
let finishKeys = []; // 完成解析的
let parsedKeys = []; //之前已经解析过的战斗日志
let failedCodes = [];

//拿到一个report就分析
let analyze = function (code) {
    console.log("分析：" + code);
    getReport(code, encounterID).then(function (report) {
        //列举所有fights(仅仅是布胖的725)
        let fights = report.reportData.report.fights.filter(fight => testFights.length <= 0 || testFights.includes(fight.id));
        let serverName = report.reportData.report.rankedCharacters ? report.reportData.report.rankedCharacters[0].server.name : '--';
        let guild = report.reportData.report.guild ? report.reportData.report.guild.faction.id : 0;
        let region = report.reportData.report.region.name;
        let startTime = report.reportData.report.startTime;
        let endTime = report.reportData.report.endTime;
        for (let fight of fights) {
            //判定是否有熊T
            getTanks(code, fight.id, fight.startTime, fight.endTime).then(function (tanks) {
                let players = tanks.reportData.report.table.data.entries;
                let druidTanks = [];
                for (let player of players) {
                    if (player.icon == "Druid-Guardian") {
                        let globalKey = player.guid + ":" + (startTime + fight.startTime);
                        if (!parsedKeys.includes(globalKey) || guild > 0) { //如果是公会日志，那么还是要解析，用于覆盖老日志
                            items[code + ":" + fight.id + ":" + player.id] = { code: code, region: region, guild: guild, startTime: startTime, endTime: endTime, id: fight.id, guid: player.guid, playerId: player.id, fightStartTime: fight.startTime, fightEndTime: fight.endTime, kill: fight.kill, serverName: serverName, playerName: player.name };
                            itemKeys.push(code + ":" + fight.id + ":" + player.id)
                            druidTanks.push(player);
                        } else {
                            console.log(player.name + ":" + new Date(startTime + fight.startTime).toLocaleString() + "已解析过");
                        }
                    }
                }

                if (druidTanks.length > 0) {
                    getAllBuffs(code, fight.id, fight.startTime, fight.endTime).then(function (allBuffs) {
                        let faction = "";
                        if (guild == 1) {
                            faction = "联盟";
                        } else if (guild == 2) {
                            faction = "部落";
                        }
                        if (guild <= 0) {
                            let theBuffs = allBuffs.reportData.report.table.data.auras.map(aura => aura.guid);
                            if (allianceBuffs.filter(b => theBuffs.indexOf(b) >= 0).length > 0) {
                                faction += "联盟";
                            }
                            if (hordeBuffs.filter(b => theBuffs.indexOf(b) >= 0).length > 0) {
                                faction += "部落";
                            }

                            if (faction.length <= 0) {
                                faction = "未知";
                            }
                        }

                        for (let player of druidTanks) {
                            //判定是否有压制
                            getBuffs(code, fight.id, player.id, fight.startTime, fight.endTime).then(function (buffs) {
                                let key = code + ":" + fight.id + ":" + player.id;
                                let auras = buffs.reportData.report.table.data.auras;
                                items[key]["faction"] = faction;
                                items[key]["pain"] = auras.filter(aura => aura.guid == PainSuppression).map(aura => aura.totalUses).reduce(function (prev, curr, idx, arr) {
                                    return prev + curr;
                                }, 0);

                                getDebuffs(code, fight.id, player.id, fight.startTime, fight.endTime).then(function (debuffs) {
                                    let auras = debuffs.reportData.report.table.data.auras;
                                    items[key]["burn"] = auras.filter(aura => aura.guid == burn).map(aura => aura.totalUses).reduce(function (prev, curr, idx, arr) {
                                        return prev + curr;
                                    }, 0);
                                    let bands = auras.filter(aura => aura.guid == stomp).map(aura => aura.bands)[0] || [];
                                    items[key]["stomp"] = bands.length;

                                    getAttribute(code, fight.id, player.id, fight.startTime, fight.endTime).then(function (attr) {
                                        let stats = attr.reportData.report.table.data.combatantInfo.stats;
                                        if (stats.Stamina) {
                                            items[key]["stam"] = stats.Stamina.max;
                                            items[key]["armor"] = stats.Armor.max;
                                            items[key]["agili"] = stats.Agility.max;
                                            items[key]["dodge"] = stats.Dodge.max;
                                        } else {
                                            items[key]["stam"] = 0;
                                            items[key]["armor"] = 0;
                                            items[key]["agili"] = 0;
                                            items[key]["dodge"] = 0;
                                        }

                                        let gear = attr.reportData.report.table.data.combatantInfo.gear;
                                        items[key]["gear"] = '';
                                        items[key]["gem"] = '';
                                        if(gear && gear.length > 0){
                                            items[key]["gear"] = gear.map(v => v.id).filter(v => v > 0).join('.');
                                            items[key]["gem"] = gear.map(v => v.gems).filter(v => v && v.length > 0).map(v => v.map(g => g.id).filter(k => k > 0).join('.')).join('.');
                                        }

                                        //获取死亡记录
                                        getDeaths(code, fight.id, fight.startTime, fight.endTime).then(function (deaths) {
                                            let dies = deaths.reportData.report.table.data.entries;
                                            let pos = dies.map(entry => entry.id).indexOf(player.id);
                                            if (pos >= 0) {
                                                items[key]["death"] = pos + 1;
                                                items[key]['deathTime'] = dies[pos]['timestamp'] - fight.startTime;
                                            } else {
                                                items[key]["death"] = 0;
                                                items[key]['deathTime'] = 0;
                                            }

                                            //获取免伤详情
                                            getReduceEvents(code, fight.id, player.id, fight.startTime, fight.endTime).then(function (redEvents) {
                                                let reduceEvents = redEvents.reportData.report.events.data;
                                                items[key]["item"] = reduceEvents.map(c => c.itemLevel).filter(c => c).length > 0 ? Math.max(...reduceEvents.map(c => c.itemLevel).filter(c => c)) : 0;

                                                //践踏期间非圣疗术的平均护甲值
                                                items[key]["avgArmor"] = 0;
                                                if (bands.length > 0) {
                                                    let armorWhenStomp = reduceEvents.filter(c => bands.filter(band => c.timestamp >= band.startTime && c.timestamp <= band.endTime).length > 0)
                                                        .filter(c => c.abilityGameID == 1) //只记录平砍
                                                        .filter(c => (c.buffs || '').split('.').filter(buff => buff.length > 0 && layOnHands.includes(parseInt(buff))).length <= 0)
                                                        .map(c => c.armor).filter(a => a);
                                                    items[key]["avgArmor"] = Math.round(armorWhenStomp.length > 0 ? armorWhenStomp.reduce((a, b) => a + b) / armorWhenStomp.length : 0);
                                                }

                                                //非践踏期间非圣疗期间的平均护甲值
                                                items[key]["maxArmor"] = 0;
                                                let armorOverall = reduceEvents.filter(c => bands.filter(band => c.timestamp >= band.startTime && c.timestamp <= band.endTime).length <= 0)
                                                .filter(c => c.abilityGameID == 1) //只记录平砍
                                                .filter(c => (c.buffs || '').split('.').filter(buff => buff.length > 0 && layOnHands.includes(parseInt(buff))).length <= 0).map(c => c.armor).filter(a => a);
                                                if(armorOverall.length > 0){
                                                    items[key]["maxArmor"] = Math.round(armorOverall.length > 0 ? armorOverall.reduce((a, b) => a + b) / armorOverall.length : 0);
                                                }

                                                //获取免伤记录
                                                getReduce(code, fight.id, player.id, fight.startTime, fight.endTime).then(function (red) {
                                                    let redu = red.reportData.report.table.data.entries.filter(c => c.guid == bossID);
                                                    if (redu.length > 0) {
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
                            });
                        }
                    });
                }else{
                    failedCodes.push(code);
                    console.log("失败：全部解析过");
                    fs.appendFileSync("data/per.csv", code + "\r\n");
                }
            });
        }
    }, function (reason) {
        failedCodes.push(code);
        console.log("失败：" + reason);

        if(reason.message.indexOf("You do not have permission") >= 0){
            fs.appendFileSync("data/per.csv", code + "\r\n");
        }
    })
};

let lastView = 0;
let page = 1;
let seeingPage = 0;
let findReports = function () {
    if (new Date().getTime() - lastView < 10 * 60 * 1000) { // 每十分钟看一轮
        return;
    }
    if (seeingPage >= page || testCode) { //正在看的页
        return;
    }

    console.log("查找页：" + page);
    seeingPage = page;
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
        .then(function (body) {
            fetched = new Date().getTime();
            let oldContent = fs.readFileSync('data/reports.csv', 'utf-8').split("\n").map(c => c.trim()).filter(d => d.length == 16);
            let content = [];
            let pageLength = 0;
            let doc = parser.parseFromString(body, "text/html");
            for (let cell of doc.getElementsByClassName("description-cell")) {
                for (let link of cell.getElementsByTagName("a")) {
                    let href = link.getAttribute("href");
                    if (href.includes("/reports/")) {
                        let code = href.substring(href.lastIndexOf("/") + 1);
                        pageLength++;
                        if (oldContent.indexOf(code) < 0) {
                            content.push(code);
                        }
                    }
                }
            }

            console.log("读取新的报告：" + content.length);
            if (content.length > 0) {
                fs.appendFileSync("data/reports.csv", content.join("\r\n") + "\r\n");
            }
            if (pageLength >= 100) {
                page++;
            } else {
                lastView = new Date().getTime();
                page = 1;
            }
            
            seeingPage = 0;
        });
}

let startOrder = 0;
let playerOrder = 0;
let startOrderOffset = 0;
let codes = [];
let delay = 500;
let writedKeys = []; //已经被写入的key
let fetched = new Date().getTime();
let poolSize = 20;
let from = 0;
let currentOldCodes = [];
let dataStruct = "序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,践踏平均护甲,非践踏平均护甲,装备等级,装备,宝石,战斗地址";
let startRun = function () {
    findReports();
    for (let key of finishKeys.filter(v => !writedKeys.includes(v))) { //对于每一个已经完成的部分
        currentOldCodes.push(items[key]['code']);
        console.log("完成" + items[key]['code']);
        fetched = new Date().getTime();
        playerOrder++;
        let codeOrder = codes.indexOf(items[key]['code']) + 1;
        let fightUrl = `https://cn.classic.warcraftlogs.com/reports/${items[key]['code']}/#fight=${items[key]['id']}&type=summary&source=${items[key]['playerId']}`;
        let output = `${playerOrder},${items[key]['faction']},${items[key]['guild'] > 0 ? '是' : '否'},${codeOrder + startOrderOffset},${items[key]['region']},`
            + `${items[key]['startTime']},${items[key]['endTime']},${items[key]['fightStartTime']},${items[key]['fightEndTime']},${items[key]['code']},${items[key]['id']},${items[key]['guid']},${items[key]['playerId']},${items[key]['kill'] ? '是' : '否'},`
            + `${items[key]['serverName']},${items[key]['playerName']},${items[key]['pain']},${items[key]['burn']},${items[key]['stomp']},${items[key]['stam']},${items[key]['armor']},${items[key]['agili']},${items[key]['dodge']},${items[key]['death']},${items[key]['deathTime']},`
            + `${items[key]['total']},${items[key]['totalReduced']},${items[key]['uses']},${items[key]['missCount']},${items[key]['avgArmor']},${items[key]['maxArmor']},${items[key]['item']},${items[key]['gear']},${items[key]['gem']},${fightUrl}`;
        console.log(output);
        if(!testCode){
            fs.appendFileSync("data/data.csv", output + "\r\n");
        }
        parsedKeys.push(items[key]['guid'] + ":" + (items[key]['startTime'] + items[key]['fightStartTime']));
        writedKeys.push(key);
    }

    //正在进行的code
    let sentCodes = codes.slice(0, startOrder); // 发出去的
    let startedCodes = itemKeys.map(v => v.split(':')[0]); // 已经启动了
    let parsingCodes = itemKeys.filter(v => !finishKeys.includes(v)).map(v => v.split(':')[0]); // 正在解析
    let usedCodes = sentCodes.filter(v => !failedCodes.includes(v)).filter(v => !startedCodes.includes(v) || parsingCodes.includes(v));
    let parsingCodesSize = new Set(usedCodes).size;
    console.log(`发送出去的code有${sentCodes.length}，正在解析中的有${parsingCodesSize}`);

    if (poolSize > parsingCodesSize) {
        let code = codes[startOrder];
        if (code) {
            if (startOrder == 0) {
                from = new Date().getTime();
            } else {
                let totalCost = new Date().getTime() - from;
                let guessedCost = totalCost / sentCodes.length * codes.length;
                if (Number.isFinite(guessedCost)) {
                    console.log(`目前耗时${totalCost / 1000}秒，预计剩余耗时${guessedCost / 1000}`)
                }
            }
            analyze(code);
            startOrder++;
        } else { // 跑完了本轮
            if (parsingCodesSize <= 0) { //如果完成了收尾工作
                let lines = [];
                if(testCode){
                    if(currentOldCodes.includes(testCode)  || failedCodes.includes(testCode)){
                        process.exit(0);
                    }
                    codes = testCode.split(',').filter(d => d.length == 16);
                }else{
                    lines = fs.readFileSync('data/data.csv', 'utf-8').split("\n").filter(c => c.length > 5);

                    if (lines.length == 0) {
                        fs.appendFileSync('data/data.csv', dataStruct + "\r\n");
                    }    
                    
                    let oldCodes = lines.map(c => c.split(",")[9]);
                    let oldParsedKeys = lines.map(l => l.split(',')).map(e => e[11] + ":" + (parseInt(e[5]) + parseInt(e[7])));
                    let perKeys = fs.readFileSync('data/per.csv', 'utf-8').split("\n").map(v => v.trim()).filter(v => v);
                    parsedKeys = Array.from(new Set(parsedKeys.concat(oldParsedKeys)));
                    console.log("已完成解析量" + parsedKeys.length);
                    codes = Array.from(new Set((fs.readFileSync('data/reports.csv', 'utf-8')).split("\n").map(c => c.trim()).filter(d => d.length == 16)));
                    console.log("共有" + codes.length + "个报告");
                    codes = codes.filter(d => !oldCodes.includes(d) && !perKeys.includes(d));
                }
                console.log("去除历史记录后有" + codes.length + "个报告");

                if (codes.length > 0) {
                    if (lines.length > 1) {
                        let lastLine = lines[lines.length - 1].split(",");
                        startOrderOffset = parseInt(lastLine[3]);
                        playerOrder = parseInt(lastLine[0]);
                    }

                    console.log("共" + codes.length + "个code，起始点" + startOrder + "，起始点偏移" + startOrderOffset + "，玩家点" + playerOrder);
                    startOrder = 0;
                } else if(!testCode){
                    lastView = 0; //重新去查看最新的code
                }
            }
        }
    }

    let cost = new Date().getTime() - fetched;
    if (cost > 60 * 1000) {
        console.log("本轮耗时：" + cost / 1000 + "秒")
        if (cost > 10 * 60 * 1000) {
            console.log("获取超时，程序退出");
            process.exit(1);
        }
    }

    setTimeout(() => {
        startRun();
    }, delay);
}

startRun(); 