// version v0.0.2
// create by ruicky
// detail url: https://github.com/ruicky/jd_sign_bot

const exec = require('child_process').execSync;
const axios = require('axios');
const fs = require('fs')

// 公共变量
const KEY = process.env.JD_COOKIE;
const serverJ = process.env.PUSH_KEY;
const DualKey = process.env.JD_COOKIE_2;
const mailEnable = process.env.MAIL_ENABLE;
const mailHost = process.env.MAIL_HOST;
const mailPort = process.env.MAIL_PORT;
const mailFrom = process.env.MAIL_FROM;
const mailPassword = process.env.MAIL_PWD;
const mailTo = process.env.MAIL_TO;


async function downFile() {
  const url = 'https://cdn.jsdelivr.net/gh/NobyDa/Script@master/JD-DailyBonus/JD_DailyBonus.js'
  // const url = 'https://raw.githubusercontent.com/NobyDa/Script/master/JD-DailyBonus/JD_DailyBonus.js';
  let r = await axios(url)
  fs.writeFileSync("./JD_DailyBonus.js", r.data)
}

async function changeFile() {
  let content = await fs.readFileSync('./JD_DailyBonus.js', 'utf8')
  content = content.replace(/var Key = ''/, `var Key = '${KEY}'`);
  if (DualKey) {
    console.log('has dual key')
    content = content.replace(/var DualKey = ''/, `var DualKey = '${DualKey}'`);
  }
  await fs.writeFileSync('./JD_DailyBonus.js', content, 'utf8')
}

async function sendMail(text, desp) {
  const nodemailer = require("nodemailer");

  // create reusable transporter object
  let transporter = nodemailer.createTransport({
    host: `${mailHost}`,
    port: `${mailPort}`,
    secure: `${mailPort === 465}`, // true for 465, false for other ports
    auth: {
      user: `${mailFrom}`, // generated ethereal user
      pass: `${mailPassword}`, // generated ethereal password
    },
  });

  // send mail with defined transport object
  await transporter.sendMail({
    from: `"JD script bot" <${mailFrom}>`, // sender address
    to: `${mailTo}`, // list of receivers
    subject: "今日签到报告", // Subject line
    html: `总报告:<br>${text}<br><br><pre>${desp}</pre>`,
  })
}

async function sendNotify(text, desp) {
  const qs = require('qs')
  await axios({
    url: `https://sc.ftqq.com/${serverJ}.send`,
    data: qs.stringify({
      text, desp
    }),
    method: 'POST'
  }).then(res => {
    console.log(res.data)
  }).catch((err) => {
    console.log(err)
  })
}

async function sendMessage(sender) {
  const {EOL} = require('os');
  const path = "./result.txt";
  if (!fs.existsSync(path)) {
    return
  }
  const lines = fs.readFileSync(path).toString().split(EOL).filter(v => v)
  let notify = ""
  let first = lines.findIndex(v => v.includes("【签到号一】"))
  let second = lines.findIndex(v => v.includes("【签到号二】"))
  const findLine = (key, start) => lines.slice(start, start + 10).find(v => v.includes(key))
  if (first === -1) {
    notify = "全部签到失败"
  } else {
    if (lines[first + 2].includes("【账号总计】")) {
      // failed
      const totalCount = parseInt(lines[first + 2].match(/【账号总计】:  ([0-9]*)京豆/)?.[1])
      notify += `号一失败 共${totalCount}`
    } else {
      // succeed
      const totalCount = parseInt(findLine("账号总计", first).match(/【账号总计】:  ([0-9]*)京豆/)?.[1])
      const got = parseInt(findLine("签到奖励", first).match(/【签到奖励】:  ([0-9]*)京豆/)?.[1])
      notify += `号一成功 得${got}共${totalCount}`
    }

    if (second && DualKey) {
      notify += " "

      if (lines[second + 2].includes("【账号总计】")) {
        // failed
        const secondTotalCount = parseInt(lines[second + 2].match(/【账号总计】:  ([0-9]*)京豆/)?.[1])
        notify += `号二失败 共${secondTotalCount}`
      } else {
        // succeed
        const secondTotalCount = parseInt(findLine("账号总计", second).match(/【账号总计】:  ([0-9]*)京豆/)?.[1])
        const got = parseInt(findLine("签到奖励", second).match(/【签到奖励】:  ([0-9]*)京豆/)?.[1])
        notify += `号二成功 得${got}共${secondTotalCount}`
      }
    }
  }
  console.log(notify)
  await sender(notify.split(' ').join('_'), lines.join(EOL.repeat(2)))
}

async function start() {
  if (!KEY) {
    console.log('请填写 key 后在继续')
    return
  }
  // 下载最新代码
  await downFile();
  console.log('下载代码完毕')
  // 替换变量
  await changeFile();
  console.log('替换变量完毕')
  // 执行
  await exec("node JD_DailyBonus.js > result.txt");
  console.log('执行完毕')

  if (serverJ) {
    await sendMessage(sendNotify)
  }
  if (mailEnable) {
    await sendMessage(sendMail)
  }
}

start()
