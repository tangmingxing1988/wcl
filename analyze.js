import fs from 'fs';

let input = fs.readFileSync('data/data.csv', 'utf-8').split("\n").map(e => e.trim()).filter(c => c.length > 5 && !c.includes("是否击杀,服务器,角色名,压制次数,燃烧次数,")).sort((a, b) => a.split(',')[2] == '是' ? -1 : 1);
let keys = [];
let validInput = [];
for (let otherLine of input) {
    let lineContent = otherLine.split(',');
    let key = lineContent[11] + ":" + (parseInt(lineContent[5]) + parseInt(lineContent[7]));
    if (!keys.includes(key)) {
        keys.push(key);
        validInput.push(otherLine);
    }
}
//增加2列：闪避值，结果
let addContent = []
let result = [];// ["序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,践踏平均护甲,非践踏平均护甲,装备等级,装备,宝石,战斗地址,血甲值,闪避值,战斗结果"];
for (let i = 0; i < validInput.length; i++) {
    let data = validInput[i].split(',');

    let pain = data[16] != '0'; //是否有压制
    let guild = data[2] == '是'; //是否是公会
    let blood = data[29]; //血甲值
    let doge = data[28] / data[27]; //闪避值

    let death = '无效'; //0表示无效战斗
    let deathOrder = parseInt(data[23]);
    let deathTime = parseInt(data[24]);
    if (deathOrder == 0 || deathTime > 360 * 1000) {
        death = '胜利'; //坚持下来了
    } else if (deathOrder <= 3 && deathTime >= 20 * 1000) {
        death = '失败'; //没坚持下来
    }
    data.push(blood);
    data.push(doge);
    data.push(death);
    result.push(data.join(','));
    addContent[i] = { death: death, pain: pain, guild: guild, blood: blood, doge: doge };
}

fs.writeFileSync("data/analyze.csv", result.join("\r\n") + "\r\n");

function sortBy(attr, rev) {
    if (rev == undefined) { rev = 1 } else { (rev) ? 1 : -1; }
    return function (a, b) {
        a = a[attr];
        b = b[attr];
        if (a < b) { return rev * -1 }
        if (a > b) { return rev * 1 }
        return 0;
    }
}

let validContent = addContent.filter(c => c.death == '胜利' || c.death == '失败')
console.log(`从${addContent.length}个报告中找出有效报告${validContent.length}个`);
let groups = [1, 2, 3, 4, 5];

for (let group of groups) {
    for (let percentage of [0.01]) {
        let groupContent = validContent;
        let groupName = "";
        switch (group) {
            case 1:
                groupName = "完整组";
                break;
            case 2:
                groupName = "压制组";
                groupContent = groupContent.filter(v => v.pain);
                break;
            case 3:
                groupName = "非压制组";
                groupContent = groupContent.filter(v => !v.pain);
                break;
            case 4:
                groupName = "公会组";
                groupContent = groupContent.filter(v => v.guild);
                break;
            case 5:
                groupName = "非公会组";
                groupContent = groupContent.filter(v => !v.guild);
                break;
        }

        console.log(`${groupName}共${groupContent.length}个，按${percentage}进行划分`)
        let bloodStream = groupContent.sort(sortBy('blood', -1));
        let bloodSize = Math.round(groupContent.length * percentage);
        let bloodLose = bloodStream.slice(0, bloodSize).filter(c => c.death == '失败').length;
        let nonBloodLose = bloodStream.slice(bloodSize).filter(c => c.death == '失败').length;
        let bloodRate = Math.round(bloodLose * 10000.0 / (bloodSize)) / 100;
        let nonBloodRate = Math.round(nonBloodLose * 10000.0 / (bloodStream.length - bloodSize)) / 100;
        console.log(`血甲流${bloodSize}死亡率${bloodRate}%，非血甲流${bloodStream.length - bloodSize}死亡率${nonBloodRate}%`);

        let dogeStream = groupContent.sort(sortBy('doge', -1));
        let dogeSize = Math.round(groupContent.length * percentage);
        let dogeLose = dogeStream.slice(0, dogeSize).filter(c => c.death == '失败').length;
        let nonDogeLose = dogeStream.slice(dogeSize).filter(c => c.death == '失败').length;
        let dogeRate = Math.round(dogeLose * 10000.0 / (dogeSize)) / 100;
        let nonDogeRate = Math.round(nonDogeLose * 10000.0 / (dogeStream.length - dogeSize)) / 100;
        console.log(`闪避流${dogeSize}死亡率${dogeRate}%，非闪避流${dogeStream.length - dogeSize}死亡率${nonDogeRate}%`);

        console.log("\n");
    }
}

