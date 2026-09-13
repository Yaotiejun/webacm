export const CAM_COPY_SUCCESS = {
  legacyDiff: '复制成功：CAM Legacy diff',
  targetLegacy: '复制成功：CAM targetLegacy',
  currentLegacy: '复制成功：CAM currentLegacy',
  comparisonBundle: '复制成功：CAM 对账包',
  sourceLabel: '复制成功：CAM sourceLabel',
  sourceFingerprint: '复制成功：CAM sourceFingerprint',
} as const

export const CAM_COPY_EMPTY = {
  legacyDiff: '当前没有可复制的 Legacy diff',
  targetLegacy: '当前会话包没有可复制的 target legacy hint',
  comparisonBundle: '当前尚未导入会话包，无法复制 CAM 对账包',
  sourceLabel: '当前会话包没有可复制的 sourceLabel',
  sourceFingerprint: '当前会话包没有可复制的 sourceFingerprint',
} as const

export const CAM_EXPORT_SUCCESS = {
  previewSettings: '已导出预览设置',
  gcode: '已导出 G-code',
  profileJson: '已导出 CAM 配置 JSON',
  profileJsonWithLocalOps: '已导出 CAM 配置 JSON（包含当前本地 ops）',
  diffActionLog: '已导出差异操作日志',
  sessionBundle: '已导出 CAM 会话包',
} as const

export const CAM_EXPORT_EMPTY = {
  profileWithLocalOps: '当前配置不完整，无法导出',
  sessionBundle: '当前没有可导出的目标快照',
} as const

export const CAM_ACTION_SUCCESS = {
  importProfileJson: '已导入 CAM 配置 JSON',
  sessionBundlePreviewLoadedReadonly: '已加载会话包预览（只读）',
  sessionBundlePreviewVerified: '已加载会话包预览（只读），G-code SHA256 校验通过',
  importPreviewSettings: '已导入预览设置',
  applySessionFieldPrefix: '已应用会话包字段：',
  applySessionBundleAll: '已一键应用会话包（device / process / ops）',
  previewLimitResetPrefix: '预览条数已恢复默认（',
  loadedSampleProfile: '已加载示例 CAM 配置（device/tools/process）',
  clonedProfile: '已克隆为新 profile',
  resetProfileEmpty: '已重置 CAM 配置为空',
  importedPartStlPrefix: '已导入工件：',
  importedPartStlPrefixLegacy: '已导入工件 STL：',
  runCamJobPrefix: '已运行 CAM 刀路生成（backend=',
  savedCarveraJobLocal: '已保存为 Carvera Job（仅本机浏览器）',
  savedGridBotJobLocal: '已保存为 GridBot Job（仅本机浏览器）',
  loadedRunSnapshot: '已载入运行快照',
  clearedRunHistory: '已清空运行记录',
  diffGeneratedPrefix: '已生成差异详情（',
  diffNoChanges: '关键字段无差异',
  applyFieldPrefix: '已应用字段：',
  undoApplied: '已撤销',
  redoApplied: '已重做',
  savedProfileAsPrefix: '已另存为 profile：',
} as const

export const CAM_ACTION_WARNING = {
  sessionBundleNoEmbeddedGcode: '会话包未嵌入完整 G-code，无法校验 targetGcodeSha256',
  sessionBundleLegacyHintMismatchPrefix: '目标会话包 Legacy hint 与当前不一致：',
  cannotApplySessionField: '当前无法应用会话包字段',
  sessionBundleMissingField: '会话包中缺少该字段',
  sessionBundleApplyFailedIncompatible: '会话包应用失败：字段不兼容',
  loadConfigBeforeClone: '请先加载 CAM 配置再克隆',
  loadCompleteConfigBeforeRun: '请先加载完整的 CAM 配置（device + process）。',
  noGcodeToSave: '当前没有可保存的 G-code',
  applyDiffFailedIncompatible: '应用失败：字段不兼容',
} as const

export const CAM_ACTION_ERROR = {
  sessionBundleGcodeShaMismatch: 'G-code SHA256 与 migrationMeta 不一致（内容或规范化规则已变化）',
  partStlParseFailed: '工件 STL/OBJ 解析失败',
  runCamJobFailed: 'CAM 刀路生成失败',
  exportFailedPrefix: '导出失败：',
} as const

export const CAM_IMPORT_MESSAGE = {
  invalidProfileJson: '导入 CAM 配置失败：JSON 结构无效',
  invalidSessionBundle: '会话包解析失败：结构无效',
  readSessionBundleFailed: '读取会话包文件失败',
  invalidPreviewSettings: '预览设置导入失败：JSON 结构无效',
  readPreviewSettingsFailed: '读取预览设置文件失败',
} as const

export const CAM_DIALOG_MESSAGE = {
  cloneProfilePrompt: '请输入新 profile 名称',
  cloneProfileTitle: '从当前配置克隆',
  applySessionFieldTitle: '确认应用会话包字段',
  confirmApplyButton: '应用',
  cancelButton: '取消',
  saveSnapshotProfilePrompt: '请输入要保存的 profile 名称',
  saveSnapshotProfileTitle: '另存运行快照为配置',
} as const

export const FDM_COPY_SUCCESS = {
  estimateMetaJson: '复制成功：FDM 估算明细 JSON',
  estimateMetaSummary: '复制成功：FDM 估算简版摘要',
  jobTelemetryDigest: '复制成功：FDM Job 诊断文本',
  jobDiagnosticsSnapshot: '复制成功：FDM Job 诊断快照',
  timelineDiagnostics: '复制成功：FDM 当前时间线诊断',
  currentLegacy: '复制成功：FDM currentLegacy',
  targetLegacy: '复制成功：FDM targetLegacy',
  comparisonBundle: '复制成功：FDM 对账包',
  sourceLabel: '复制成功：FDM sourceLabel',
  sourceFingerprint: '复制成功：FDM sourceFingerprint',
} as const

export const FDM_COPY_EMPTY = {
  currentLegacy: '当前没有可复制的 Legacy FDM 运行时信息',
  targetLegacy: '当前 Job 没有可复制的 Legacy FDM 运行时信息',
  estimateMetaJson: '当前没有可复制的估算明细',
  estimateMetaSummary: '当前没有可复制的估算摘要',
  jobTelemetryDigest: '当前 Job 没有可复制的告警摘要或输入网格元数据',
  jobDiagnosticsSnapshot: '当前 Job 没有已保存的诊断快照',
  timelineDiagnostics: '当前没有可复制的时间线诊断',
  sourceLabel: '当前没有可复制的 FDM sourceLabel',
  sourceFingerprint: '当前没有可复制的 FDM sourceFingerprint',
} as const

export const FDM_EXPORT_SUCCESS = {
  estimateMetaJson: '估算明细 JSON 已导出',
  gcode: '已导出 G-code',
} as const

export const FDM_EXPORT_EMPTY = {
  estimateMetaJson: '当前没有可导出的估算明细',
  gcodeRequiresSlice: '请先执行一次切片',
} as const

export const FDM_ACTION_SUCCESS = {
  sliceSavedJob: '切片完成（mock/Kiri 测试路径），已保存 Job',
  sendToCarvera: '已发送到 Carvera',
  sendToGridBot: '已发送到 GridBot',
  kiriPocPrefix: 'Kiri PoC 成功：共 ',
  kiriPocSuffix: ' 层（详情见控制台）',
  updatedCurrentJob: '已更新当前 Job',
  restoredModelListFromJobPrefix: '已从 Job 恢复模型列表，请按文件名重新导入：',
} as const

export const FDM_ACTION_WARNING = {
  noSliceableModels: '当前没有可切片的模型',
  noSliceableGeometry: '当前场景中没有可切片的几何',
  noModelInfoToSave: '当前没有可保存的模型信息',
  modelNeedsReimportFromJob: '该模型来自 Job 恢复，请重新导入对应文件',
} as const

export const FDM_ACTION_INFO = {
  sliceRequired: '请先执行一次切片',
  previewPlaceholder: '预览功能将随着真实切片数据接入而增强',
  kiriPocBuiltinCube: 'Kiri PoC 使用内置测试立方体几何（未导入模型）',
  selectedJobPrefix: '选中 Job：',
} as const

export const FDM_ACTION_ERROR = {
  sliceFailedPrefix: '切片失败：',
  kiriPocFailedPrefix: 'Kiri PoC 失败：',
} as const

export const COPY_FAILURE_MESSAGE = '复制失败：请检查剪贴板权限'
export const UNKNOWN_ERROR_MESSAGE = '未知错误'

