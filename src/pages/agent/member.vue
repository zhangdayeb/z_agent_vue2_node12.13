<template>
  <div class="member-container">
    <!-- 搜索区域 -->
    <div class="search-section">
      <el-card shadow="never" class="search-card">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="用户名">
            <el-input
              v-model="searchForm.username"
              placeholder="请输入用户名"
              clearable
              style="width: 200px"
              @keyup.enter.native="handleSearch"
            />
          </el-form-item>

          <el-form-item label="注册时间">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              style="width: 240px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" icon="el-icon-search" @click="handleSearch">
              搜索
            </el-button>
            <el-button icon="el-icon-refresh" @click="handleReset">
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 会员列表 -->
    <div class="table-section">
      <el-card shadow="never">
        <div slot="header" class="table-header">
          <span class="table-title">会员列表</span>
          <span class="total-count">共 {{ totalCount }} 人</span>
        </div>

        <el-table
          v-loading="loading"
          :data="memberList"
          stripe
          border
          style="width: 100%"
          empty-text="暂无数据"
        >
          <el-table-column
            prop="id"
            label="用户ID"
            width="100"
            align="center"
          />

          <el-table-column
            prop="name"
            label="用户名"
            width="150"
            show-overflow-tooltip
          />

          <el-table-column
            prop="created_at"
            label="注册时间"
            width="160"
            align="center"
          >
            <template slot-scope="scope">
              {{ formatDateTime(scope.row.created_at) }}
            </template>
          </el-table-column>

          <el-table-column
            prop="money"
            label="当前余额"
            width="140"
            align="right"
          >
            <template slot-scope="scope">
              <span
                :class="{
                  'money-text': true,
                  'editable-field': canEditBalance(scope.row)
                }"
                :title="canEditBalance(scope.row) ? '点击调整用户余额' : ''"
                @click="canEditBalance(scope.row) && showBalanceDialog(scope.row)"
              >
                {{ formatMoney(scope.row.money) }}
                <i v-if="canEditBalance(scope.row)" class="el-icon-edit edit-icon"></i>
              </span>
            </template>
          </el-table-column>

          <el-table-column
            prop="money_rebate"
            label="返水余额"
            width="120"
            align="right"
          >
            <template slot-scope="scope">
              <span class="rebate-text">{{ formatMoney(scope.row.money_rebate) }}</span>
            </template>
          </el-table-column>

          <el-table-column
            prop="money_fanyong"
            label="返佣余额"
            width="120"
            align="right"
          >
            <template slot-scope="scope">
              <span class="rebate-text">{{ formatMoney(scope.row.money_fanyong) }}</span>
            </template>
          </el-table-column>

          <el-table-column
            prop="fanyong_proportion"
            label="返佣比例"
            width="120"
            align="center"
          >
            <template slot-scope="scope">
              <span
                :class="{
                  'commission-text': true,
                  'editable-field': canEditCommission(scope.row),
                  'disabled-field': !canEditCommission(scope.row)
                }"
                :title="getCommissionTooltip(scope.row)"
                @click="canEditCommission(scope.row) && showCommissionDialog(scope.row)"
              >
                {{ formatCommission(scope.row.fanyong_proportion) }}
                <i v-if="canEditCommission(scope.row)" class="el-icon-edit edit-icon"></i>
                <i v-else-if="!canEditCommission(scope.row) && isSubAgent(scope.row)" class="el-icon-lock lock-icon"></i>
              </span>
            </template>
          </el-table-column>

          <el-table-column
            prop="vip_grade"
            label="会员等级"
            width="100"
            align="center"
          >
            <template slot-scope="scope">
              <el-tag
                :type="getVipTagType(scope.row.vip_grade)"
                size="small"
              >
                VIP{{ scope.row.vip_grade }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="pagination.page"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="pagination.limit"
            :total="totalCount"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </el-card>
    </div>

    <!-- 余额调整对话框 -->
    <el-dialog
      title="调整用户余额"
      :visible.sync="balanceDialogVisible"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="currentUser">
        <div class="dialog-info">
          <p><strong>用户：</strong>{{ currentUser.name }}</p>
          <p><strong>当前余额：</strong><span class="money-text">{{ formatMoney(currentUser.money) }}</span></p>
          <p><strong>代理余额：</strong><span class="money-text">{{ formatMoney(agentBalance) }}</span></p>
        </div>

        <el-form :model="balanceForm" :rules="balanceRules" ref="balanceForm" label-width="100px">
          <el-form-item label="调整方式" prop="type">
            <el-radio-group v-model="balanceForm.type">
              <el-radio label="add">增加金额</el-radio>
              <el-radio label="subtract">减少金额</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="调整金额" prop="amount">
            <el-input
              v-model="balanceForm.amount"
              placeholder="请输入调整金额"
              type="number"
              step="0.01"
              min="0.01"
            >
              <template slot="append">元</template>
            </el-input>
          </el-form-item>

          <el-form-item label="调整后余额">
            <span class="preview-text">{{ previewUserBalance }}</span>
          </el-form-item>

          <el-form-item label="调整后代理余额">
            <span class="preview-text">{{ previewAgentBalance }}</span>
          </el-form-item>

          <el-form-item label="备注说明" prop="remark">
            <el-input
              v-model="balanceForm.remark"
              type="textarea"
              placeholder="请输入备注说明"
              :rows="3"
            />
          </el-form-item>
        </el-form>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="balanceDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleBalanceSubmit" :loading="submitLoading">确认调整</el-button>
      </span>
    </el-dialog>

    <!-- 返佣比例调整对话框 -->
    <el-dialog
      title="调整返佣比例"
      :visible.sync="commissionDialogVisible"
      width="450px"
      :close-on-click-modal="false"
    >
      <div v-if="currentUser">
        <div class="dialog-info">
          <p><strong>用户：</strong>{{ currentUser.name }}</p>
          <p><strong>当前返佣比例：</strong><span class="commission-text">{{ formatCommission(currentUser.fanyong_proportion) }}</span></p>
        </div>

        <el-form :model="commissionForm" :rules="commissionRules" ref="commissionForm" label-width="100px">
          <el-form-item label="新返佣比例" prop="proportion">
            <el-input
              v-model="commissionForm.proportion"
              placeholder="请输入返佣比例 (如: 0.05)"
              type="number"
              step="0.01"
              min="0"
              max="1"
            />
            <div class="form-tip">范围：0.00 - 1.00</div>
          </el-form-item>

          <el-form-item label="备注说明" prop="remark">
            <el-input
              v-model="commissionForm.remark"
              type="textarea"
              placeholder="请输入备注说明"
              :rows="3"
            />
          </el-form-item>
        </el-form>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="commissionDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleCommissionSubmit" :loading="submitLoading">确认调整</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { memberApi, adjustMemberBalanceApi, adjustMemberCommissionApi } from '@/api/agentApi'

export default {
  name: 'Member',
  data() {
    return {
      // 搜索表单
      searchForm: {
        username: '',
        dateRange: []
      },

      // 会员列表数据
      memberList: [],
      loading: false,
      totalCount: 0,

      // 分页参数
      pagination: {
        page: 1,
        limit: 20
      },

      // 代理余额
      agentBalance: 0,

      // 余额调整对话框
      balanceDialogVisible: false,
      currentUser: null,
      submitLoading: false,
      balanceForm: {
        type: 'add',
        amount: '',
        remark: ''
      },
      balanceRules: {
        type: [
          { required: true, message: '请选择调整方式', trigger: 'change' }
        ],
        amount: [
          { required: true, message: '请输入调整金额', trigger: 'blur' },
          { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入有效的金额', trigger: 'blur' },
          { validator: this.validateAmount, trigger: 'blur' }
        ],
        remark: [
          { required: true, message: '请输入备注说明', trigger: 'blur' }
        ]
      },

      // 返佣比例调整对话框
      commissionDialogVisible: false,
      commissionForm: {
        proportion: '',
        remark: ''
      },
      commissionRules: {
        proportion: [
          { required: true, message: '请输入返佣比例', trigger: 'blur' },
          { pattern: /^(0(\.\d{1,4})?|1(\.0{1,4})?)$/, message: '请输入0.00-1.00之间的数值', trigger: 'blur' }
        ],
        remark: [
          { required: true, message: '请输入备注说明', trigger: 'blur' }
        ]
      }
    }
  },

  computed: {
    // 预览调整后的用户余额
    previewUserBalance() {
      if (!this.currentUser || !this.balanceForm.amount) {
        return this.formatMoney(this.currentUser && this.currentUser.money ? this.currentUser.money : 0)
      }

      const currentMoney = parseFloat(this.currentUser.money)
      const adjustAmount = parseFloat(this.balanceForm.amount)

      if (this.balanceForm.type === 'add') {
        return this.formatMoney(currentMoney + adjustAmount)
      } else {
        return this.formatMoney(currentMoney - adjustAmount)
      }
    },

    // 预览调整后的代理余额
    previewAgentBalance() {
      if (!this.balanceForm.amount) return this.formatMoney(this.agentBalance)

      const adjustAmount = parseFloat(this.balanceForm.amount)

      if (this.balanceForm.type === 'add') {
        return this.formatMoney(this.agentBalance - adjustAmount)
      } else {
        return this.formatMoney(this.agentBalance + adjustAmount)
      }
    }
  },

  mounted() {
    this.loadMemberList()
    this.loadAgentBalance()
  },

  methods: {
    /**
     * 加载会员列表
     */
    async loadMemberList() {
      this.loading = true

      try {
        // 构建请求参数
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit
        }

        // 添加搜索条件
        if (this.searchForm.username) {
          params.username = this.searchForm.username
        }

        if (this.searchForm.dateRange && this.searchForm.dateRange.length === 2) {
          params.start_date = this.searchForm.dateRange[0]
          params.end_date = this.searchForm.dateRange[1]
        }

        // 调用API
        const response = await memberApi(params)

        if (response.code === 200) {
          this.memberList = response.data.list || []
          this.totalCount = response.data.total || 0
        } else {
          this.$message.error(response.message || '获取会员列表失败')
          this.memberList = []
          this.totalCount = 0
        }

      } catch (error) {
        console.error('加载会员列表错误:', error)
        this.$message.error('网络连接异常，请稍后重试')
        this.memberList = []
        this.totalCount = 0
      } finally {
        this.loading = false
      }
    },

    /**
     * 加载代理余额
     */
    async loadAgentBalance() {
      try {
        // 这里需要调用获取代理信息的API
        // const response = await getAgentInfoApi()
        // this.agentBalance = response.data.money || 0
        this.agentBalance = 10000 // 临时数据
      } catch (error) {
        console.error('获取代理余额失败:', error)
      }
    },

    /**
     * 判断是否可以调整余额
     */
    canEditBalance(row) {
      // 只要是该代理下的用户就可以调整余额
      return true // 根据实际业务逻辑调整
    },

    /**
     * 判断是否可以调整返佣比例
     */
    canEditCommission(row) {
      // 只有 user_agent_id_1 为空或0的用户才能调整
      return !row.user_agent_id_1 || row.user_agent_id_1 === 0
    },

    /**
     * 判断是否是子级代理用户
     */
    isSubAgent(row) {
      return row.user_agent_id_1 && row.user_agent_id_1 !== 0
    },

    /**
     * 获取返佣比例提示文本
     */
    getCommissionTooltip(row) {
      if (this.canEditCommission(row)) {
        return '点击调整返佣比例'
      } else if (this.isSubAgent(row)) {
        return '该用户的返佣比例只能通过用户前端进行调整，请登录相应的用户账号'
      }
      return ''
    },

    /**
     * 显示余额调整对话框
     */
    showBalanceDialog(row) {
      this.currentUser = { ...row }
      this.balanceForm = {
        type: 'add',
        amount: '',
        remark: ''
      }
      this.balanceDialogVisible = true
    },

    /**
     * 显示返佣比例调整对话框
     */
    showCommissionDialog(row) {
      this.currentUser = { ...row }
      this.commissionForm = {
        proportion: row.fanyong_proportion || '0.00',
        remark: ''
      }
      this.commissionDialogVisible = true
    },

    /**
     * 提交余额调整
     */
    async handleBalanceSubmit() {
      try {
        await this.$refs.balanceForm.validate()

        this.submitLoading = true

        const params = {
          user_id: this.currentUser.id,
          type: this.balanceForm.type,
          amount: parseFloat(this.balanceForm.amount),
          remark: this.balanceForm.remark
        }

        const response = await adjustMemberBalanceApi(params)

        if (response.code === 200) {
          this.$message.success('余额调整成功')
          this.balanceDialogVisible = false
          this.loadMemberList()
          this.loadAgentBalance()
        } else {
          this.$message.error(response.message || '余额调整失败')
        }

      } catch (error) {
        if (error !== false) { // 不是表单验证错误
          console.error('余额调整错误:', error)
          this.$message.error('操作失败，请稍后重试')
        }
      } finally {
        this.submitLoading = false
      }
    },

    /**
     * 提交返佣比例调整
     */
    async handleCommissionSubmit() {
      try {
        await this.$refs.commissionForm.validate()

        this.submitLoading = true

        const params = {
          user_id: this.currentUser.id,
          proportion: parseFloat(this.commissionForm.proportion),
          remark: this.commissionForm.remark
        }

        const response = await adjustMemberCommissionApi(params)

        if (response.code === 200) {
          this.$message.success('返佣比例调整成功')
          this.commissionDialogVisible = false
          this.loadMemberList()
        } else {
          this.$message.error(response.message || '返佣比例调整失败')
        }

      } catch (error) {
        if (error !== false) { // 不是表单验证错误
          console.error('返佣比例调整错误:', error)
          this.$message.error('操作失败，请稍后重试')
        }
      } finally {
        this.submitLoading = false
      }
    },

    /**
     * 验证调整金额
     */
    validateAmount(rule, value, callback) {
      const amount = parseFloat(value)
      if (isNaN(amount) || amount <= 0) {
        callback(new Error('调整金额必须大于0'))
        return
      }

      if (this.balanceForm.type === 'add') {
        if (amount > this.agentBalance) {
          callback(new Error('代理余额不足'))
          return
        }
      } else {
        if (amount > parseFloat(this.currentUser.money)) {
          callback(new Error('用户余额不足'))
          return
        }
      }

      callback()
    },

    /**
     * 搜索处理
     */
    handleSearch() {
      this.pagination.page = 1
      this.loadMemberList()
    },

    /**
     * 重置搜索
     */
    handleReset() {
      this.searchForm = {
        username: '',
        dateRange: []
      }
      this.pagination.page = 1
      this.loadMemberList()
    },

    /**
     * 分页大小改变
     */
    handleSizeChange(val) {
      this.pagination.limit = val
      this.pagination.page = 1
      this.loadMemberList()
    },

    /**
     * 当前页改变
     */
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadMemberList()
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(datetime) {
      if (!datetime) return '-'
      return datetime.replace(/:\d{2}$/, '')
    },

    /**
     * 格式化金额
     */
    formatMoney(amount) {
      if (amount === null || amount === undefined) return '0.00'
      return parseFloat(amount).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },

    /**
     * 格式化返佣比例
     */
    formatCommission(proportion) {
      if (proportion === null || proportion === undefined) return '0.00'
      return parseFloat(proportion).toFixed(2)
    },

    /**
     * 获取VIP等级标签类型
     */
    getVipTagType(vipGrade) {
      if (vipGrade >= 5) return 'danger'
      if (vipGrade >= 3) return 'warning'
      if (vipGrade >= 1) return 'success'
      return 'info'
    }
  }
}
</script>

<style scoped>
.member-container {
  padding: 20px;
}

.search-section {
  margin-bottom: 20px;
}

.search-card {
  border: 1px solid #f0f0f0;
}

.search-form {
  margin-bottom: 0;
}

.table-section {
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.total-count {
  font-size: 14px;
  color: #909399;
}

.money-text {
  color: #67C23A;
  font-weight: 600;
}

.rebate-text {
  color: #E6A23C;
  font-weight: 600;
}

.commission-text {
  color: #409EFF;
  font-weight: 600;
}

.editable-field {
  cursor: pointer;
  position: relative;
  padding-right: 16px;
}

.editable-field:hover {
  background-color: #f5f7fa;
  padding: 2px 16px 2px 4px;
  border-radius: 4px;
}

.disabled-field {
  color: #C0C4CC;
  cursor: not-allowed;
  position: relative;
  padding-right: 16px;
}

.edit-icon {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: #409EFF;
  font-size: 12px;
}

.lock-icon {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: #F56C6C;
  font-size: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.dialog-info {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.dialog-info p {
  margin: 8px 0;
  color: #606266;
}

.preview-text {
  color: #67C23A;
  font-weight: 600;
  font-size: 14px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.dialog-footer {
  text-align: right;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .member-container {
    padding: 10px;
  }

  .search-form {
    flex-direction: column;
  }

  .search-form .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .total-count {
    margin-top: 5px;
  }

  .pagination-wrapper {
    text-align: center;
  }
}
</style>
