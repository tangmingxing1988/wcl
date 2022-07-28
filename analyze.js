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
let result = [];// ["序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,全程平均护甲,物品等级,实际躲闪率,战斗结果,战斗地址"];
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
    data.splice(-1, 0, doge);
    data.splice(-1, 0, death);
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
for (let percentage of [0.01, 0.02, 0.05, 0.08, 0.1, 0.15, 0.2, 1]) {
    console.log(percentage)
    let stream = validContent.sort(sortBy('blood', -1)).slice(0, validContent.length * percentage);
    let win = stream.filter(c => c.death == '胜利').length;
    let lose = stream.filter(c => c.death == '失败').length;
    console.log((win + lose) + "血甲流死亡率：" + Math.round(lose * 10000.0 / (win + lose)) / 100);

    stream = validContent.sort(sortBy('doge', -1)).slice(0, validContent.length * percentage);
    win = stream.filter(c => c.death == '胜利').length;
    lose = stream.filter(c => c.death == '失败').length;
    console.log((win + lose) + "躲闪流死亡率：" + Math.round(lose * 10000.0 / (win + lose)) / 100);
}

