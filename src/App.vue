<template>
  <div id="app" style="height: 100%">
    <router-view/>
  </div>
</template>

<script>
  export default {
    name: 'App',
    created() {
      this.initState()
      this.getMenuList()
    },
    methods: {
      // 初始化State
      initState() {
        this.$store.dispatch('user/initState')
        this.$store.dispatch('worktab/initState')
        this.$store.dispatch('setting/initState')
      },
      // 获取菜单列表
      getMenuList() {
        let{ href } = location
        let url = ''
        if(href.indexOf('localhost') === -1) {
          url = '/' + href.split('/')[3] + url

        }
      },
      /**
       * 根据权限匹配路由并返回
       * @param {array} permission    后台返回的权限列表（菜单列表）
       * @param {array} allowRouters  需要权限的路由表
       */
      routerMatch(permission, allowRouters) {
        return new Promise((resolve) => {
          const routers = []
          function createRouter(permission) {
            permission.forEach((item) => {
              let { path } = item
              let pathArr = path && path.split('/')

              if(pathArr) {
                path = pathArr[pathArr.length-1]
              }

              if (item.children && item.children.length) {
                createRouter(item.children)
              }

              allowRouters.find((s) => {
                if (s.children) {
                  s.children.find((y) => {
                    if (y.path === path) {
                      y.meta.permission = item.permission
                      routers.push(s);
                    }
                  })
                }else {
                  if (path && s.path === path) {
                    s.meta.permission = item.permission
                    routers.push(s);
                  }
                }
              })
            })
          }
          createRouter(permission)
          resolve(Array.from(new Set(routers)))
        })
      }
    }
  }
</script>
