'use strict';

let co = require("co");
const Payment = require('../index').Payment;
const fs = require('fs');

let key = '<key>'; //用于签名的key, 可在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置中进行设置
let appid = '<appid>'; //微信公众平台appid
let mid = '<mid>'; //微信商户平台mid
let certFile = '<location of apiclient_cert.p12>'; //pkcs12格式证书文件
let opts = {
  deviceInfo: '<deviceInfo>', //设备号
  partnerTradeNo: '<partnerTradeNo>', //商户订单号
  openid: '<openid>', //用户openid
  checkName: '<checkName>',//校验用户姓名选项
  reUserName: '<reUserName>',//收款用户姓名
  amount: 100,
  desc: '<desc>',
  spbillCreateIp: '<spbillCreateIp>' //调用接口的机器Ip地址
};

co(function* () {
  let pfx = fs.readFileSync(certFile);
  let pay = new Payment(appid, mid, key, pfx);
  let body = yield pay.enterprisePay(opts);
  return body;
}).then(function (value) {
  console.log(value);
}, function (err) {
  console.error(err.stack);
});
