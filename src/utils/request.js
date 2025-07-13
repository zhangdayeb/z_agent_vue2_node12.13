import axios from "axios"
import store from '../store'
import router from '../router'
import { baseUrl, group_prefix } from "./config.js"
import { Message } from "element-ui"
import qs from 'qs'

let cancel, promiseArr = {}
const CancelToken = axios.CancelToken
const source = CancelToken.source()

// 从localStorage获取token
function getTokenFromStorage() {
  return localStorage.getItem('token') || ''
}

//请求拦截器
axios.interceptors.request.use(
  config => {
    config.cancelToken = source.token // 全局添加cancelToken

    //发起请求时，取消掉当前正在进行的相同请求
    if (promiseArr[config.url]) {
      promiseArr[config.url]("操作取消")
      promiseArr[config.url] = cancel
    } else {
      promiseArr[config.url] = cancel
    }

    // 拼接域名
    config.url = baseUrl + config.url

    // 获取token
    const token = getTokenFromStorage()

    // 设置请求头 - JWT标准格式
    config.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': token ? `Bearer ${token}` : '', // JWT标准格式
      'group_prefix': group_prefix, // 从配置文件读取
      ...config.headers // 保留可能的自定义headers
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

//响应拦截器即异常处理
axios.interceptors.response.use(
  response => {
    let { code, msg } = response.data

    //登录页不需要提示
    if (code !== 1 && !window.location.hash.includes('login')) {
      Message.error(msg)
    }

    // token验证失败，重新登录
    if (code === 7) {
      setTimeout(() => {
        document.getElementsByTagName("html")[0].removeAttribute('class') // 移除暗黑主题
        localStorage.removeItem('token') // 清除token
        store.dispatch('user/setLoginStatus', false)
        router.replace('/login')
        // 使用router.go(0)而不是this.$router.go(0)
        router.go(0)
      }, 1500)
    }

    if (response) {
      return response
    }
  },
  err => {
    if (err && err.response) {
      switch (err.response.status) {
        case 400:
          err.message = "错误请求 - 请求参数有误"
          break
        case 401:
          err.message = "未授权 - 请重新登录"
          // 401状态码处理 - 清除token并跳转登录
          localStorage.removeItem('token')
          store.dispatch('user/setLoginStatus', false)
          if (!window.location.hash.includes('login')) {
            router.replace('/login')
          }
          break
        case 402:
          err.message = "需要付款"
          break
        case 403:
          err.message = "拒绝访问 - 权限不足"
          break
        case 404:
          err.message = "请求错误 - 未找到该资源"
          break
        case 405:
          err.message = "请求方法未允许"
          break
        case 406:
          err.message = "不接受的请求"
          break
        case 407:
          err.message = "需要代理身份验证"
          break
        case 408:
          err.message = "请求超时"
          break
        case 409:
          err.message = "请求冲突"
          break
        case 410:
          err.message = "资源已不存在"
          break
        case 411:
          err.message = "需要Content-Length"
          break
        case 412:
          err.message = "前提条件失败"
          break
        case 413:
          err.message = "请求实体过大"
          break
        case 414:
          err.message = "请求URI过长"
          break
        case 415:
          err.message = "不支持的媒体类型"
          break
        case 416:
          err.message = "请求范围无效"
          break
        case 417:
          err.message = "期望失败"
          break
        case 418:
          err.message = "我是茶壶"
          break
        case 421:
          err.message = "请求被误导"
          break
        case 422:
          err.message = "实体无法处理"
          break
        case 423:
          err.message = "资源被锁定"
          break
        case 424:
          err.message = "依赖失败"
          break
        case 425:
          err.message = "过早的请求"
          break
        case 426:
          err.message = "需要升级协议"
          break
        case 428:
          err.message = "需要前提条件"
          break
        case 429:
          err.message = "请求过于频繁"
          break
        case 431:
          err.message = "请求头字段过大"
          break
        case 451:
          err.message = "因法律原因不可用"
          break
        case 500:
          err.message = "服务器内部错误"
          break
        case 501:
          err.message = "功能未实现"
          break
        case 502:
          err.message = "网关错误"
          break
        case 503:
          err.message = "服务不可用"
          break
        case 504:
          err.message = "网关超时"
          break
        case 505:
          err.message = "HTTP版本不支持"
          break
        case 506:
          err.message = "变体协商错误"
          break
        case 507:
          err.message = "存储空间不足"
          break
        case 508:
          err.message = "检测到循环"
          break
        case 510:
          err.message = "未扩展"
          break
        case 511:
          err.message = "需要网络身份验证"
          break
        default:
          err.message = `连接错误 ${err.response.status}`
      }
    } else {
      err.message = "连接到服务器失败"
    }

    if (err && err.response) {
      Message.error(err.message)
    }

    return Promise.reject(err)
  }
)

// 设置默认超时时间
axios.defaults.timeout = 100000

//get请求方式
function get(config) {
  return new Promise((resolve, reject) => {
    axios({
      url: config.url,
      method: "get",
      params: config.data
    })
    .then(res => {
      resolve(res.data)
    })
    .catch(err => {
      reject(err)
    })
  })
}

//post请求方式
function post(config) {
  return new Promise((resolve, reject) => {
    // 确保data存在
    if (config.data == undefined) {
      config.data = {}
    }

    axios({
      url: config.url,
      method: "post",
      data: qs.stringify(config.data)
    })
    .then(res => {
      resolve(res.data)
    })
    .catch(err => {
      reject(err)
    })
  })
}

export default {
  get,
  post
}
