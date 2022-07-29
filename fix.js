import { getDebuffs, getReduceEvents, setLog } from './api.js';
import fs from 'fs';

let layOnHands = [633, 2800, 10310, 27154, 20233, 20236, 9257];
let stomp = 45185;
let fixLineTop = 24000;
let fixLineBottom = 22000;
let lines = fs.readFileSync('data/data.csv', 'utf-8').split("\n").filter(c => c.length > 5).map(v => v.trim());
//序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,
//是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,践踏平均护甲,非践踏平均护甲,装备等级,装备,宝石,战斗地址

let result = [];
const fixIt = function(line){
	if(line.indexOf('战斗开始时间,战斗结束时间') >= 0){
		result.push(line);
		console.log("表头  ======>  " + result.length)
		return;
	}

	let data = line.split(',');
	let code = data[9];
	let fightID = parseInt(data[10]);
	let playerID = parseInt(data[12]);
	let startTime = parseInt(data[7]);
	let endTime = parseInt(data[8]);
	let oldStompArmor = parseInt(data[29]);
	if(oldStompArmor < fixLineBottom || oldStompArmor >= fixLineTop){
		result.push(line);
		console.log("不合适  ======>  " + result.length)
		return;
	}

	getDebuffs(code, fightID, playerID, startTime, endTime).then(function (debuffs) {
		let auras = debuffs.reportData.report.table.data.auras;
		let bands = auras.filter(aura => aura.guid == stomp).map(aura => aura.bands)[0] || [];

		//获取免伤详情
		getReduceEvents(code, fightID, playerID, startTime, endTime).then(function (redEvents) {
			let reduceEvents = redEvents.reportData.report.events.data;
			//践踏期间非圣疗术的平均护甲值
			let stompArmor = 0;
			if (bands.length > 0) {
				let armorWhenStomp = reduceEvents.filter(c => bands.filter(band => c.timestamp > band.startTime && c.timestamp < band.endTime).length > 0)
					.filter(c => c.abilityGameID == 1) //只记录平砍
					.filter(c => (c.buffs || '').split('.').filter(buff => buff.length > 0 && layOnHands.includes(parseInt(buff))).length <= 0)
					.map(c => c.armor).filter(a => a);
				stompArmor = Math.round(armorWhenStomp.length > 0 ? armorWhenStomp.reduce((a, b) => a + b) / armorWhenStomp.length : 0);
			}

			//非践踏期间非圣疗期间的平均护甲值
			let normalArmor = 0;
			let armorOverall = reduceEvents.filter(c => bands.filter(band => c.timestamp > band.startTime && c.timestamp < band.endTime).length <= 0)
				.filter(c => c.abilityGameID == 1) //只记录平砍
				.filter(c => (c.buffs || '').split('.').filter(buff => buff.length > 0 && layOnHands.includes(parseInt(buff))).length <= 0).map(c => c.armor).filter(a => a);
			if (armorOverall.length > 0) {
				normalArmor = Math.round(armorOverall.length > 0 ? armorOverall.reduce((a, b) => a + b) / armorOverall.length : 0);
			}

			data[29] = stompArmor;
			data[30] = normalArmor;
			result.push(data.join(','));
			console.log("推出  ======>  " + data.join(','))
		}, function(error){
			result.push(line);
		});
	}, function(error){
		result.push(line);
	});
}

let i = 0;
let poolSize = 50;
const startRun = function(){
	while(i - result.length < poolSize && i < lines.length){
		fixIt(lines[i]);
		i++;
	}

	if(result.length >= lines.length){
		fs.writeFileSync("data/data.csv", result.join("\r\n") + "\r\n");
	}else{
		setTimeout(() => {
			startRun();
		}, 1000);		
	}
}

startRun();