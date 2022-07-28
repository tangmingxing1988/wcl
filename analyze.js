import fs from 'fs';

let input = fs.readFileSync('data/data.csv', 'utf-8').split("\n").map(e => e.trim()).filter(c => c.length > 5 && !c.includes("是否击杀,服务器,角色名,压制次数,燃烧次数,"));
//增加5列：血甲值，血甲相对值，闪避值，闪避相对值，死亡情况
let addContent = []
let result = ["序号,阵营,公会报告,报告序号,地区,开始时间,结束时间,战斗开始时间,战斗结束时间,报告编码,战斗编号,玩家全局编号,玩家编号,是否击杀,服务器,角色名,压制次数,燃烧次数,践踏次数,耐力,护甲,敏捷,躲闪等级,死亡序号,死亡时间,原始承伤,实际承伤,原始平砍次数,未中平砍次数,践踏平均护甲,全程平均护甲,物品等级,实际躲闪率,战斗结果,战斗地址"];
for (let i = 0; i < input.length; i++) {
    let data = input[i].split(',');

    let pain = data[16] != '0'; //是否有压制
    let guild = data[2] == '是'; //是否是公会
    let blood = data[29]; //血甲值
    let doge = data[28] / data[27]; //闪避值

    let death = '无效'; //0表示无效战斗
    let deathOrder = parseInt(data[23]);
    let deathTime = parseInt(data[24]);
    if (deathOrder == 0 || deathTime > 360 * 1000) {
        death = '胜利'; //坚持下来了
    } else if (deathOrder <= 3) {
        death = '失败'; //没坚持下来
    }
    data.splice(-1, 0, doge);
    data.splice(-1, 0, death);
    result.push(data.join(','));
    addContent[i] = { death: death, pain: pain, guild: guild, blood: blood, doge: doge };
}

fs.writeFileSync("data/analyze.csv", result.join("\r\n") + "\r\n");



// let percentage = 0.01;

// function sortBy(attr, rev) {
//     if (rev == undefined) { rev = 1 } else { (rev) ? 1 : -1; }
//     return function (a, b) {
//         a = a[attr];
//         b = b[attr];
//         if (a < b) { return rev * -1 }
//         if (a > b) { return rev * 1 }
//         return 0;
//     }
// }
// let stream = addContent.sort(sortBy('blood', 1)).slice(0, addContent.length * percentage);
// let win = stream.filter(c => c.death == '胜利').length;
// let lose = stream.filter(c => c.death == '失败').length;
// console.log((win + lose) + "血甲流死亡率%：" + (lose * 100.0 / (win + lose)));

// stream = addContent.sort(sortBy('doge', 1)).slice(0, addContent.length * percentage);
// win = stream.filter(c => c.death == '胜利').length;
// lose = stream.filter(c => c.death == '失败').length;
// console.log((win + lose) + "躲闪流死亡率%：" + (lose * 100.0 / (win + lose)));