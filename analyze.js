import fs from 'fs';

let input = fs.readFileSync('data/data.csv', 'utf-8').split("\n").map(e => e.trim()).filter(c => c.length > 5 && !c.includes("服务器,角色名")).sort((a, b) => a.split(',')[2] == '是' ? -1 : 1);
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
let result = ["序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,践踏平均护甲,非践踏平均护甲,装备等级,装备,宝石,战斗地址,血甲值,闪避值,战斗结果"];
for (let i = 0; i < validInput.length; i++) {
    let data = validInput[i].split(',');

    let pain = data[16] != '0'; //是否有压制
    let guild = data[2] == '是'; //是否是公会
    let blood = data[29]; //血甲值
    let doge = data[28] / data[27]; //闪避值

    let death = '死亡';
    let deathOrder = parseInt(data[23]);
    let deathTime = parseInt(data[24]);
    if (deathOrder == 0 || deathTime > 360 * 1000) {
        death = '存活'; //坚持下来了
    } else {
        let duration = parseInt(data[8]) - parseInt(data[7]);
        if (duration < 30 * 1000) {
            death = '战斗过短';
        } else {
            let melee = parseInt(data[27]);
            if (melee < 50) {
                death = "平砍过少";
            } else if (deathOrder > 3) {
                death = "减员过多";
            }
        }
    }
    data.push(blood);
    data.push(doge);
    data.push(death);
    result.push(data.join(','));
    addContent[i] = { id: parseInt(data[0]), death: death, pain: pain, guild: guild, blood: blood, doge: doge, burn: parseInt(data[17]) };
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

let validContent = addContent.filter(c => c.death == '存活' || c.death == '死亡')
console.log(`最后实际获取的报告有${Array.from(new Set(input.map(v => v.split(",")[9]))).length}份，战斗有${validInput.length}场。无效战斗共${validInput.length - validContent.length}场，有效战斗共${validContent.length}场`);
let groups = [1, 2, 3, 4, 5, 6, 7];

let percentage = 0.01;
for (let group of groups) {
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
        case 6:
            groupName = "燃烧组";
            groupContent = groupContent.filter(v => v.burn > 0);
            break;
        case 7:
            groupName = "非燃烧组";
            groupContent = groupContent.filter(v => v.burn <= 0);
            break;
    }

    console.log(`${groupName}共${groupContent.length}个，死亡${groupContent.filter(c => c.death == '死亡').length}个`)
    let totalRate = Math.round(groupContent.filter(c => c.death == '死亡').length * 10000.0 / (groupContent.length)) / 100;
    console.log(`整体死亡率是${totalRate}%`);
    let bloodSize = Math.round(groupContent.length * percentage);
    let bloodLose = groupContent.sort(sortBy('blood', -1)).slice(0, bloodSize).filter(c => c.death == '死亡').length;
    let bloodRate = Math.round(bloodLose * 10000.0 / (bloodSize)) / 100;
    console.log(`血甲流${bloodSize}死亡率${bloodRate}%`);

    let dogeSize = Math.round(groupContent.length * percentage);
    let dogeLose = groupContent.sort(sortBy('doge', -1)).slice(0, dogeSize).filter(c => c.death == '死亡').length;
    let dogeRate = Math.round(dogeLose * 10000.0 / (dogeSize)) / 100;
    console.log(`闪避流${dogeSize}死亡率${dogeRate}%\r\n`);
}

