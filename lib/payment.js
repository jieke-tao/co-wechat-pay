'use strict';

const md5 = require('md5');
const sha1 = require('sha1');
const xml2js = require('xml2js');
var urllib = require('urllib');
var _ = require('underscore');

const URLS = {
  ENTERPRISE_PAY: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers' //企业付款API地址
};

const SIGN_TYPES = {
  MD5: md5,
  SHA1: sha1
};

/**
 * 支付构造函数
 *
 * @param appid 微信分配的公众账号ID
 * @param mchid 微信支付分配的商户号
 * @param key 用于签名的key, 可在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置中进行设置
 * @param pfx pkcs12格式证书
 * @param passphrase 证书密码, 不设置默认为商户号
 * @returns {Payment}
 * @constructor
 */
var Payment = function (appid, mchid, key, pfx, passphrase) {
  this.appid = appid;
  this.mchid = mchid;
  this.pfx = pfx;
  this.key = key;
  this.passphrase = passphrase || this.mchid;
  this.nonce_str = this._generateNonceStr(32);
  return this;
};

/**
 * 企业付款接口, 根据选项内容进行付款
 *
 * Examples:
 * ```
 * let opts = {
 *    deviceInfo: '<deviceInfo>', //设备号
 *    partnerTradeNo: '<partnerTradeNo>', //商户订单号
 *    openid: '<openid>', //用户openid
 *    checkName: '<checkName>',//校验用户姓名选项
 *    reUserName: '<reUserName>',//收款用户姓名
 *    amount: <amount>, //付款金额
 *    desc: '<desc>', //付款描述
 *    spbillCreateIp: '<spbillCreateIp>' //调用接口的机器Ip地址
 * };
 * pay.enterprisePay(opts);
 *
 * ```
 * @param opts  付款选项
 * @returns {*}
 */
Payment.prototype.enterprisePay = function* (opts) {
  let info = _.extend({
    mch_appid: this.appid,
    mchid: this.mchid,
    nonce_str: this.nonce_str
  }, {
    partner_trade_no: opts.partnerTradeNo,
    openid: opts.openid,
    check_name: opts.checkName,
    re_user_name: opts.reUserName,
    amount: opts.amount,
    desc: opts.desc,
    spbill_create_ip: opts.spbillCreateIp
  });
  info.sign = this._sign(info);
  let xml = this._buildXml(info);
  let options = {
    method: 'POST',
    data: xml,
    pfx: this.pfx,
    passphrase: this.passphrase
  };
  return yield this._request(URLS.ENTERPRISE_PAY, options);
};

Payment.prototype._sign = function (config, signType) {
  signType = signType || 'MD5';
  let sortedString = this._sortedQueryString(config);
  let stringSignTemp = sortedString + '&key=' + this.key;
  let signValue = SIGN_TYPES[signType](stringSignTemp).toUpperCase();
  return signValue;
};

Payment.prototype._buildXml = function (obj) {
  var builder = new xml2js.Builder();
  var xml = builder.buildObject({xml: obj});
  return xml;
};

Payment.prototype._sortedQueryString = function (object) {
  return Object.keys(object).filter(function (key) {
    return object[key] !== undefined && object[key] !== '';
  }).sort().map(function (key) {
    return key + '=' + object[key];
  }).join('&');
};

Payment.prototype._generateNonceStr = function (length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var maxPos = chars.length;
  var noceStr = '';
  var i;
  for (i = 0; i < (length || 32); i++) {
    noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return noceStr;
};

Payment.prototype._request = function * (url, opts) {
  var options = {};
  opts || (opts = {});
  for (let key in opts) {
    if (key !== 'headers') {
      options[key] = opts[key];
    } else {
      if (opts.headers) {
        options.headers = options.headers || {};
        _.extend(options.headers, opts.headers);
      }
    }
  }

  let result;
  try {
    result = yield urllib.requestThunk(url, options);
  } catch (err) {
    err.name = 'WeChatPay' + err.name;
    throw err;
  }

  let data = result.data;

  if (data.errcode) {
    var err = new Error(data.errmsg);
    err.name = 'WeChatPayError';
    err.code = data.errcode;
    throw err;
  }
  return data;
};

exports.Payment = Payment;