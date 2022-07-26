import { getReports } from "./blode.js";
import fs from 'fs';
import fetch from "node-fetch";
import DOMParser from 'dom-parser';

let parser = new DOMParser();

// let findReports = function(page, auto = false){
//     console.log("查找页：" + page)
//     getReports(page).then(function(data){
//         let reports = data.reportData.reports.data;
//         let content = [];
//         for(let report of reports){
//             content.push(report.code + "," + report.startTime + "," + report.endTime);
//         }

//         fs.appendFileSync("reports.csv", content.join("\r\n"));

//         if(auto && reports.length >= 100){
//             setTimeout(() => {
//                 findReports(page + 1, true);                
//             }, 0);
//         }
//     });
// };

// findReports(5, true);

let findReports = function(page, auto = false){
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
            let content = [];
          let doc = parser.parseFromString(body, "text/html");
          for(let cell of doc.getElementsByClassName("description-cell")){
              for(let link of cell.getElementsByTagName("a")){
                let href = link.getAttribute("href");
                if(href.includes("/reports/")){
                    content.push(href.substring(href.lastIndexOf("/") + 1));
                }
              }
          }

          fs.appendFileSync("reports.csv", "\r\n" + content.join("\r\n"));

        if(auto){
            let delay = content.length >= 100 ? 1000 : 60 * 1000;
            let nextPage = content.length >= 100 ? page + 1 : 1;
            setTimeout(() => {
                findReports(nextPage, true);                
            }, delay);
        }
      });
}

findReports(1, true);