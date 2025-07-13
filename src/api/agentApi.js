import axios from '@/utils/request';

export function MemberApi(params) {
  return axios.post({
    url: '/agent/member',
    data: params
  }).then((res) => {
    return res
  })
}
