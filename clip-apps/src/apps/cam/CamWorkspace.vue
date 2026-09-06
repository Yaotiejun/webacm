<template>
  <el-container class="cam-root">
    <el-aside width="320px" class="cam-aside">
      <div class="pane-title">设备配置</div>
      <div class="pane-body">
        <div v-if="!device" class="hint">尚未加载示例配置。</div>
        <el-descriptions v-else :column="1" border size="small">
          <el-descriptions-item label="名称">{{ device.deviceName }}</el-descriptions-item>
          <el-descriptions-item label="工作区">
            {{ device.bedWidth }} x {{ device.bedDepth }} x {{ device.maxHeight }}
          </el-descriptions-item>
          <el-descriptions-item label="原点">
            {{ device.originCenter ? '中心' : '角落' }}
          </el-descriptions-item>
          <el-descriptions-item label="G-code 后缀">{{ device.gcodeFExt || '默认' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-aside>

    <el-container class="cam-center">
      <el-main class="cam-main cam-main-center">
        <GcodePreviewPanel
          layout="cam"
          kind="cam"
          :job-gcode="camViewportGcode"
          :tool-position="camViewportTool"
          :stem-color="camViewportStem"
          :preset-overrides="camGcodePresetOverrides"
          title="CAM — G-code 路径预览（Legacy / 导入）"
        >
          <template #toolbar>
            <el-button size="small" plain @click="onPickCamGcodePreview">导入 G-code 覆盖预览</el-button>
            <el-button size="small" plain @click="onLoadGripFixturePreview">grip 金样预览</el-button>
            <el-button size="small" plain @click="onCopyCamFixtureSha">复制 fixture SHA</el-button>
            <el-button size="small" plain @click="onCompareCamMotionToFixture">对比金样 motion</el-button>
            <el-button size="small" plain :disabled="!camViewportGcodeOverride" @click="onClearCamGcodePreviewOverride">
              清除覆盖
            </el-button>
            <span class="hint">
              运行「生成 CAM 刀路」后显示 legacy cam_export G-code；可导入 G-code 覆盖预览。需已配置 ops 与 stock。
            </span>
          </template>
          <template #afterViewport>
            <input
              ref="camGcodePreviewInputRef"
              type="file"
              accept=".gcode,.nc,.tap,.txt"
              style="display: none"
              @change="onCamGcodePreviewFile"
            />
          </template>
        </GcodePreviewPanel>
      </el-main>
    </el-container>

    <el-aside width="360px" class="cam-aside-right">
      <div class="pane-title">工艺 / 操作</div>
      <div class="pane-body">
        <div class="pane-title" style="padding: 4px 0; border: none">刀具库</div>
        <ul v-if="tools.length" class="tool-list">
          <li v-for="tool in tools" :key="tool.id" class="tool-item">
            <strong>{{ tool.name }}</strong>
            <span class="hint">
              (#{{ tool.number }}) {{ tool.type }}
              {{ tool.flute_diam }}
              {{ tool.metric ? 'mm' : 'in' }}
            </span>
          </li>
        </ul>
        <div v-else class="hint">暂无刀具。</div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">CAM 工艺管理</div>
        <div class="pane-body" style="padding-top: 0">
          <div v-if="profiles && profiles.length" style="margin-bottom: 8px">
            <el-table :data="profiles" size="small" border height="140">
              <el-table-column prop="name" label="名称" min-width="120">
                <template #default="scope">
                  <span>{{ scope.row.name }}</span>
                  <el-tag
                    v-if="scope.row.name === selectedProfileName"
                    size="small"
                    type="success"
                    style="margin-left: 4px"
                  >
                    当前
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button
                    size="small"
                    type="primary"
                    text
                    @click.stop="store.selectProfile(scope.row.name)"
                  >
                    选择
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    text
                    @click.stop="store.deleteProfile(scope.row.name)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px">
            <el-button
              size="small"
              plain
              :disabled="!device || !process"
              @click="onCloneFromCurrent"
            >
              从当前配置克隆
            </el-button>
          </div>

          <el-divider />

          <div class="pane-title" style="padding: 4px 0; border: none">配置导入 / 导出</div>
          <input
            ref="camPartFileInputRef"
            type="file"
            accept=".stl"
            style="display: none"
            @change="onCamPartFileChange"
          />
          <input
            id="cam-profile-file-input"
            type="file"
            accept="application/json,.json"
            style="display: none"
            @change="onImportProfileFile"
          />
          <input
            id="cam-session-bundle-file-input"
            type="file"
            accept="application/json,.json"
            style="display: none"
            @change="onImportSessionBundlePreview"
          />
          <input
            id="cam-session-preview-settings-file-input"
            type="file"
            accept="application/json,.json"
            style="display: none"
            @change="onImportSessionPreviewSettings"
          />
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <el-button size="small" plain @click="onPickCamPartStl">导入工件 STL</el-button>
            <el-button size="small" plain @click="onLoadSample">加载示例配置</el-button>
            <el-button size="small" plain @click="onResetProfile">重置为空</el-button>
            <el-button size="small" plain @click="onClickImport">导入 JSON</el-button>
            <el-button size="small" plain @click="onClickImportSessionBundle">导入会话包预览</el-button>
            <el-button size="small" plain @click="onClickImportSessionPreviewSettings">导入预览设置</el-button>
            <el-button size="small" plain @click="onExportSessionPreviewSettings">导出预览设置</el-button>
            <el-button size="small" plain :disabled="!device" @click="onExportProfile">导出 JSON</el-button>
            <el-button size="small" plain :disabled="!device || !process || !(localOps && localOps.length)" @click="onExportProfileWithLocalOps">
              导出(含本地ops)
            </el-button>
          </div>
          <div class="hint" style="margin-top: 6px">
            工件：{{ camPartInfoText }}
          </div>
          <div class="hint" style="margin-top: 6px">
            JSON 结构与 grip/grid-apps-master/src/cli/kiri-cam-(device|tools|process).json 对齐：
            { device, tools, process }
            <div style="margin-top: 4px">
              自测闭环建议：加载示例 → 修改右侧工艺参数/ops → 导出 JSON（或“导出(含本地ops)”）→ 重置为空 → 导入刚导出的 JSON → 检查字段是否一致。
            </div>
          </div>
        </div>

        <div class="pane-title" style="padding: 4px 0; border: none">Stock / Z / 速度</div>
        <div v-if="process" class="pane-body" style="padding-top: 4px">
          <el-form :model="process" label-width="90px" label-position="left" size="small">
            <el-form-item label="Stock 尺寸">
              <el-input-number
                v-model="process.camStockX"
                :min="0"
                :max="10000"
                :step="1"
                controls-position="right"
              />
              <span style="margin: 0 4px">x</span>
              <el-input-number
                v-model="process.camStockY"
                :min="0"
                :max="10000"
                :step="1"
                controls-position="right"
              />
              <span style="margin: 0 4px">x</span>
              <el-input-number
                v-model="process.camStockZ"
                :min="0"
                :max="10000"
                :step="1"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Stock Offset">
              <el-switch v-model="process.camStockOffset" />
              <span class="hint" style="margin-left: 6px">是否以模型为基准自动对齐毛坯</span>
            </el-form-item>
            <el-form-item label="Stock 启用">
              <el-switch v-model="process.camStockOn" />
            </el-form-item>

            <el-divider content-position="left">Z / 原点</el-divider>
            <el-form-item label="Z Anchor">
              <el-select v-model="process.camZAnchor" style="width: 120px">
                <el-option label="top" value="top" />
                <el-option label="middle" value="middle" />
                <el-option label="bottom" value="bottom" />
              </el-select>
              <span class="hint" style="margin-left: 6px">Z 参考面</span>
            </el-form-item>
            <el-form-item label="Z 偏移">
              <el-input-number v-model="process.camZOffset" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Z Bottom">
              <el-input-number v-model="process.camZBottom" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Z Clearance">
              <el-input-number v-model="process.camZClearance" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Z Thru">
              <el-input-number v-model="process.camZThru" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Z 顶面为原点">
              <el-switch v-model="process.camOriginTop" />
            </el-form-item>

            <el-divider content-position="left">快速移动</el-divider>
            <el-form-item label="Fast XY">
              <el-input-number
                v-model="process.camFastFeed"
                :min="0"
                :max="100000"
                :step="10"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Fast Z">
              <el-input-number
                v-model="process.camFastFeedZ"
                :min="0"
                :max="100000"
                :step="10"
                controls-position="right"
              />
            </el-form-item>
          </el-form>
        </div>
        <div v-else class="hint">暂无工艺配置。</div>

        <div v-if="process" class="pane-body" style="margin-top: 8px; padding-top: 4px">
          <div style="font-weight: 600; margin-bottom: 4px">工艺摘要 / 快速编辑</div>
          <el-form :model="process" label-width="90px" label-position="left" size="small">
            <el-divider content-position="left">粗加工</el-divider>
            <el-form-item label="Rough Tool">
              <el-input-number v-model="process.camRoughTool" :min="0" :max="9999" controls-position="right" />
            </el-form-item>
            <el-form-item label="Rough Spindle">
              <el-input-number
                v-model="process.camRoughSpindle"
                :min="0"
                :max="100000"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Rough Down">
              <el-input-number
                v-model="process.camRoughDown"
                :min="0"
                :max="1000"
                :step="0.1"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Rough Over">
              <el-input-number
                v-model="process.camRoughOver"
                :min="0"
                :max="10"
                :step="0.1"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Rough Speed">
              <el-input-number
                v-model="process.camRoughSpeed"
                :min="0"
                :max="100000"
                controls-position="right"
              />
            </el-form-item>

            <el-divider content-position="left">外轮廓</el-divider>
            <el-form-item label="Outline Tool">
              <el-input-number v-model="process.camOutlineTool" :min="0" :max="9999" controls-position="right" />
            </el-form-item>
            <el-form-item label="Outline Spindle">
              <el-input-number
                v-model="process.camOutlineSpindle"
                :min="0"
                :max="100000"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Outline Down">
              <el-input-number
                v-model="process.camOutlineDown"
                :min="0"
                :max="1000"
                :step="0.1"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Outline Over">
              <el-input-number
                v-model="process.camOutlineOver"
                :min="0"
                :max="10"
                :step="0.1"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Outline Speed">
              <el-input-number
                v-model="process.camOutlineSpeed"
                :min="0"
                :max="100000"
                controls-position="right"
              />
            </el-form-item>

            <el-divider content-position="left">钻孔</el-divider>
            <el-form-item label="Drill Tool">
              <el-input-number v-model="process.camDrillTool" :min="0" :max="9999" controls-position="right" />
            </el-form-item>
            <el-form-item label="Drill Spindle">
              <el-input-number v-model="process.camDrillSpindle" :min="0" :max="100000" controls-position="right" />
            </el-form-item>
            <el-form-item label="Drill Down">
              <el-input-number v-model="process.camDrillDown" :min="0" :max="1000" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Drill Lift">
              <el-input-number v-model="process.camDrillLift" :min="0" :max="100" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Drill Dwell">
              <el-input-number v-model="process.camDrillDwell" :min="0" :max="10" :step="0.1" controls-position="right" />
            </el-form-item>
            <el-form-item label="Drill DownSpeed">
              <el-input-number v-model="process.camDrillDownSpeed" :min="0" :max="100000" :step="10" controls-position="right" />
            </el-form-item>

            <el-divider content-position="left">方向 / 其它</el-divider>
            <el-form-item label="Conventional">
              <el-switch v-model="process.camConventional" />
            </el-form-item>
            <el-form-item label="Depth First">
              <el-switch v-model="process.camDepthFirst" />
            </el-form-item>
            <el-form-item label="Ease Down">
              <el-switch v-model="process.camEaseDown" />
            </el-form-item>
            <el-form-item label="Force ZMax">
              <el-switch v-model="process.camForceZMax" />
            </el-form-item>

            <el-divider content-position="left">输出 / G-code</el-divider>
            <el-form-item label="反转 X">
              <el-switch v-model="process.outputInvertX" />
            </el-form-item>
            <el-form-item label="反转 Y">
              <el-switch v-model="process.outputInvertY" />
            </el-form-item>
            <el-form-item label="Stock ClipTo">
              <el-switch v-model="process.camStockClipTo" />
            </el-form-item>
            <el-form-item label="Arc Tol">
              <el-input-number
                v-model="process.camArcTolerance"
                :min="0"
                :max="1"
                :step="0.001"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="Arc Res">
              <el-input-number
                v-model="process.camArcResolution"
                :min="0"
                :max="1"
                :step="0.001"
                controls-position="right"
              />
            </el-form-item>
          </el-form>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">操作序列 (ops)</div>
        <ul v-if="effectiveOps && effectiveOps.length" class="ops-list">
          <li
            v-for="(op, idx) in effectiveOps"
            :key="idx"
            class="ops-item"
            :style="{ cursor: 'pointer', fontWeight: selectedOpIndex === idx ? '600' : 'normal' }"
            @click="selectOp(idx)"
          >
            <strong>#{{ idx + 1 }} {{ op.type }}</strong>
            <div class="hint">
              tool={{ op.tool ?? '—' }} spindle={{ op.spindle ?? '—' }} down={{ op.down ?? '—' }} step={{ op.step ?? '—' }}
            </div>
          </li>
        </ul>
        <div v-else class="hint">暂无操作。</div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">编辑操作（本地）</div>
        <div v-if="selectedOp" class="hint">
          <div style="display: grid; grid-template-columns: 90px 1fr; gap: 6px 8px; align-items: center">
            <div>tool</div>
            <el-input-number
              size="small"
              :model-value="selectedOp.tool ?? null"
              :min="0"
              controls-position="right"
              @update:model-value="(v: number | null) => updateSelectedOpField('tool', (v ?? undefined) as any)"
            />

            <div>spindle</div>
            <el-input-number
              size="small"
              :model-value="selectedOp.spindle ?? null"
              :min="0"
              controls-position="right"
              @update:model-value="(v: number | null) => updateSelectedOpField('spindle', (v ?? undefined) as any)"
            />

            <div>down</div>
            <el-input-number
              size="small"
              :model-value="selectedOp.down ?? null"
              :min="0"
              controls-position="right"
              @update:model-value="(v: number | null) => updateSelectedOpField('down', (v ?? undefined) as any)"
            />

            <div>step</div>
            <el-input-number
              size="small"
              :model-value="selectedOp.step ?? null"
              :min="0"
              controls-position="right"
              @update:model-value="(v: number | null) => updateSelectedOpField('step', (v ?? undefined) as any)"
            />
          </div>
          <div class="hint" style="margin-top: 6px">
            说明：这里只改组件本地 ops 副本，不写回 profile JSON；重新导入/加载会重置。
          </div>
        </div>
        <div v-else class="hint">点击上方 ops 选择一条再编辑。</div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">CAM 刀路生成（Legacy桥接）</div>
        <div class="pane-body" style="padding-top: 4px">
          <el-alert
            v-if="kiriLegacyBridgeLabel"
            :title="kiriLegacyBridgeLabel"
            :type="kiriLegacyHintLevel"
            :closable="false"
            show-icon
            style="margin-bottom: 8px"
          />
          <div v-if="camRunInProgress" style="margin-bottom: 8px">
            <div class="hint" style="margin-bottom: 4px">
              {{ camRunProgressLabel || 'Legacy cam_slice…' }}（{{ camRunProgress }}%）
            </div>
            <el-progress :percentage="camRunProgress" :stroke-width="10" />
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 6px">
            <el-button
              size="small"
              type="primary"
              plain
              :disabled="!device || !process || camRunInProgress"
              :loading="camRunInProgress"
              @click="onRunCamJob"
            >
              生成 CAM 刀路（Legacy）
            </el-button>
            <el-button
              v-if="camResult && camResult.gcodeText"
              size="small"
              plain
              @click="onCopyCamGcode"
            >
              复制 G-code
            </el-button>
            <el-button
              v-if="camResult && camResult.gcodeText"
              size="small"
              plain
              @click="onDownloadGcode"
            >
              下载 G-code
            </el-button>
            <el-button
              v-if="camResult && camResult.gcodeText"
              size="small"
              type="success"
              plain
              @click="onSaveToCarvera"
            >
              保存为 Carvera Job
            </el-button>
            <el-button
              v-if="camResult && camResult.gcodeText"
              size="small"
              type="success"
              plain
              @click="onSaveToGridBot"
            >
              保存为 GridBot Job
            </el-button>
          </div>
          <div v-if="camGcodeMotionHint" class="hint" style="margin-top: 6px">{{ camGcodeMotionHint }}</div>
          <div v-if="camGripMotionMatchHint" class="hint" style="margin-top: 4px">{{ camGripMotionMatchHint }}</div>
          <el-input
            type="textarea"
            :rows="8"
            :model-value="camResultText"
            readonly
            style="font-family: monospace; font-size: 11px"
          />
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">最近运行</div>
        <div class="pane-body" style="padding-top: 4px">
          <el-empty v-if="!recentRuns.length" description="暂无运行记录" />
          <el-table v-else :data="recentRuns" size="small" border height="180">
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column label="后端" width="90">
              <template #default="scope">
                {{ scope.row.result.backend }}
              </template>
            </el-table-column>
            <el-table-column label="网格" width="110">
              <template #default="scope">
                {{ camGeometryMeshLabel(scope.row.geometry) }}
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="150">
              <template #default="scope">
                {{ new Date(scope.row.createdAt).toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="190">
              <template #default="scope">
                <el-button size="small" text @click="onLoadRecentRun(scope.row.id)">载入</el-button>
                <el-button size="small" text @click="onSaveRecentRunAsProfile(scope.row.id)">另存配置</el-button>
                <el-button size="small" text @click="onCompareRecentRun(scope.row.id)">对比当前</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="recentRuns.length" style="margin-top: 8px">
            <el-button size="small" plain @click="onClearRecentRuns">清空运行记录</el-button>
          </div>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">差异详情（快照 vs 当前）</div>
        <div class="pane-body" style="padding-top: 4px">
          <div v-if="!diffTargetRunName" class="hint">先在“最近运行”里点击“对比当前”。</div>
          <template v-else>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
              <div class="hint">目标快照：{{ diffTargetRunName }}</div>
              <div style="display: flex; gap: 6px">
                <el-button size="small" plain :disabled="undoStack.length === 0" @click="onUndoApply">撤销</el-button>
                <el-button size="small" plain :disabled="redoStack.length === 0" @click="onRedoApply">重做</el-button>
              </div>
            </div>
            <el-empty v-if="!diffItems.length" description="关键字段无差异" />
            <el-table v-else :data="diffItems" size="small" border height="180">
              <el-table-column label="字段" min-width="120">
                <template #default="scope">
                  <span style="display: inline-flex; align-items: center; gap: 6px">
                    <el-tag v-if="scope.row.riskLevel === 'high'" size="small" type="danger" effect="light">高风险</el-tag>
                    <el-tag
                      v-else-if="scope.row.riskLevel === 'medium'"
                      size="small"
                      type="warning"
                      effect="light"
                    >
                      中风险
                    </el-tag>
                    <span>{{ scope.row.label }}</span>
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="current" label="当前值" min-width="120" />
              <el-table-column prop="snapshot" label="快照值" min-width="120" />
              <el-table-column label="操作" width="80">
                <template #default="scope">
                  <el-button size="small" text @click="onApplyDiffItem(scope.row)">应用</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pane-title" style="padding: 4px 0; border: none; margin-top: 8px">操作日志</div>
            <div style="display: flex; gap: 8px; margin-bottom: 6px">
              <el-button size="small" plain :disabled="!diffActionLogs.length" @click="onExportDiffLogs">导出日志</el-button>
              <el-button size="small" plain :disabled="!diffTargetRunId" @click="onExportCamSessionBundle">导出会话包</el-button>
            </div>
            <el-empty v-if="!diffActionLogs.length" description="暂无操作日志" />
            <el-table v-else :data="diffActionLogs" size="small" border height="140">
              <el-table-column prop="time" label="时间" width="150" />
              <el-table-column prop="action" label="动作" width="80" />
              <el-table-column prop="field" label="字段" min-width="120" />
            </el-table>
          </template>
        </div>
        <el-divider />
        <div class="pane-title" style="padding: 4px 0; border: none">会话包预览（只读）</div>
        <div class="pane-body" style="padding-top: 4px">
          <div v-if="!sessionBundlePreview" class="hint">尚未导入会话包。</div>
          <template v-else>
            <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap">
              <el-button size="small" type="primary" plain @click="applySessionBundleAll">一键应用全部</el-button>
              <el-button size="small" plain @click="applySessionBundleField('device')">应用 device</el-button>
              <el-button size="small" plain @click="applySessionBundleField('process')">应用 process</el-button>
              <el-button size="small" plain @click="applySessionBundleField('ops')">应用 ops</el-button>
              <el-select
                size="small"
                :model-value="sessionPreviewLimit"
                style="width: 130px"
                @change="(v: number) => onChangeSessionPreviewLimit(v)"
              >
                <el-option
                  v-for="limit in SESSION_PREVIEW_LIMIT_OPTIONS"
                  :key="limit"
                  :value="limit"
                  :label="`预览 ${limit} 项`"
                />
              </el-select>
              <el-button size="small" plain @click="resetSessionPreviewLimit">恢复默认</el-button>
            </div>
            <div
              v-if="sessionBundleLegacyHintDiffText"
              class="hint"
              style="margin-bottom: 8px; color: #b88230; display: flex; gap: 8px; align-items: center; flex-wrap: wrap"
            >
              <span>Legacy hint diff: {{ sessionBundleLegacyHintDiffText }}</span>
              <el-button size="small" text @click="copySessionBundleLegacyHintDiff">复制 diff</el-button>
              <el-button size="small" text @click="copySessionBundleTargetLegacyHint">复制 target</el-button>
              <el-button size="small" text @click="copySessionCurrentLegacyHealth">复制 current</el-button>
              <el-button size="small" text @click="copySessionLegacyComparisonBundle">复制对账包</el-button>
            </div>
            <div
              class="hint"
              style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap"
            >
              <span>traceSchemaVersion: {{ TRACE_SCHEMA_VERSION }}</span>
            </div>
            <div
              class="hint"
              style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap"
            >
              <span>sourceLabel: {{ sessionBundleSourceLabelText }}</span>
              <el-button size="small" text @click="copySessionBundleSourceLabel">复制 sourceLabel</el-button>
            </div>
            <div
              class="hint"
              style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap"
            >
              <span>sourceFingerprint: {{ sessionBundleSourceFingerprintText }}</span>
              <el-button size="small" text @click="copySessionBundleSourceFingerprint">复制 sourceFingerprint</el-button>
            </div>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="schemaVersion">
                {{ sessionBundlePreview.migrationMeta?.schemaVersion ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="source">
                {{ sessionBundlePreview.migrationMeta?.source ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="activeProfile">
                {{ sessionBundlePreview.migrationMeta?.activeProfile ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="targetRun">
                {{ sessionBundlePreview.targetRun?.name ?? '—' }} / {{ sessionBundlePreview.targetRun?.result?.backend ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="sessionBundlePreview.targetRun?.result?.legacyDebug" label="targetRun.legacy">
                slice={{ sessionBundlePreview.targetRun.result.legacyDebug.hasSlice ? 'Y' : 'N' }},
                export={{ sessionBundlePreview.targetRun.result.legacyDebug.hasExport ? 'Y' : 'N' }},
                ready={{ sessionBundlePreview.targetRun.result.legacyDebug.ready ? 'Y' : 'N' }}
              </el-descriptions-item>
              <el-descriptions-item label="diff条目">
                {{ sessionBundlePreview.diff?.items?.length ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="diff日志">
                {{ sessionBundlePreview.diff?.logs?.length ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="sessionBundlePreview.migrationMeta?.engineHints?.targetGcodeSha256"
                label="targetGcodeSha256"
              >
                <span style="font-family: monospace; font-size: 11px; word-break: break-all">
                  {{ sessionBundlePreview.migrationMeta.engineHints.targetGcodeSha256 }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item
                v-if="sessionBundlePreview.migrationMeta?.engineHints?.targetLegacyReady != null"
                label="targetLegacyHint"
              >
                ready={{ sessionBundlePreview.migrationMeta.engineHints.targetLegacyReady ? 'Y' : 'N' }},
                slice={{ sessionBundlePreview.migrationMeta.engineHints.targetLegacyHasSlice ? 'Y' : 'N' }},
                export={{ sessionBundlePreview.migrationMeta.engineHints.targetLegacyHasExport ? 'Y' : 'N' }}
                <span v-if="sessionBundlePreview.migrationMeta.engineHints.targetLegacyImportError" class="hint">
                  ，import={{ sessionBundlePreview.migrationMeta.engineHints.targetLegacyImportError }}
                </span>
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </div>
      </div>
    </el-aside>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { useCamStore } from '@/stores/useCamStore'
import { useCarveraStore } from '@/stores/useCarveraStore'
import { useGridBotStore } from '@/stores/useGridBotStore'
import { runCamJob } from '@/api/cam'
import { camGeometryMeshLabel, hydrateCamJobGeometry } from '@/core/cam/camGeometryPersist'
import { loadCamLastRunPreview, saveCamLastRunPreview } from '@/core/cam/camLastRunPersist'
import { getGripCamFixturePreviewGcode } from '@/core/cam/camGripFixturePreview'
import { buildCamGripFixtureDevHint } from '@/core/cam/camGripFixtureDevHint'
import { compareCamMotionToGripFixture } from '@/core/cam/camGripFixtureMotionCompare'
import { buildCamPostRunGripFeedback } from '@/core/cam/camPostRunGripFeedback'
import { camGcodeForClipboard } from '@/core/cam/camGcodeClipboard'
import { getKiriCamLegacyHealth } from '@/core/cam/kiriCamRuntime'
import { useKiriCamLegacyStatus } from '@/composables/useKiriCamLegacyStatus'
import { useGcodePathEndToolPosition } from '@/composables/useGcodePathEndToolPosition'
import type { CamJobInputGeometry, CamJobResult } from '@/types/camJob'
import type { CamOperationInstance, CamProcessConfig } from '@/types/cam'
import {
  createCarveraJobFromBridgeGcode,
  createGridBotJobFromBridgeGcode,
} from '@/core/jobs/bridgeGcodeJob'
import type { CamRunSnapshot } from '@/stores/useCamStore'
import {
  buildSessionApplyAllPreview,
  buildSessionApplyPreview,
  canBuildSessionApplyPreview,
  type SessionApplyField,
} from '@/core/cam/sessionApplyPreview'
import { applySessionFieldToState } from '@/core/cam/sessionApplyExecutor'
import { popRedoWithCurrentToUndo, popUndoWithCurrentToRedo, pushUndoAndClearRedo } from '@/core/cam/sessionHistory'
import { applyDiffKeyToState } from '@/core/cam/sessionDiffApply'
import { buildSessionSnapshotDiffItems, type DiffItem } from '@/core/cam/sessionSnapshotDiff'
import {
  appendDiffActionLog,
  createDiffLogExportArtifact,
  type DiffActionLog,
} from '@/core/cam/sessionDiffLog'
import { formatCamResultText } from '@/core/cam/camResultText'
import { formatCamGcodeMotionLine, summarizeCamGcodeMotion } from '@/core/cam/camGcodeStats'
import { createCamSessionBundleExportArtifact, normalizeTargetRunProfileForSessionExport } from '@/core/cam/sessionBundleExport'
import { verifyCamSessionBundleGcodeSha256 } from '@/core/cam/sessionBundleFingerprintVerify'
import { resolveCamSessionBundleTrace } from '@/core/cam/sessionBundleTraceResolve'
import {
  buildCamLegacyHintComparisonBundleText,
  compareCamSessionLegacyHintWithCurrent,
  formatCamCurrentLegacyHealth,
  formatCamSessionLegacyTargetHint,
} from '@/core/cam/sessionBundleLegacyHintCompare'
import {
  CAM_ACTION_ERROR,
  CAM_ACTION_SUCCESS,
  CAM_ACTION_WARNING,
  CAM_COPY_EMPTY,
  CAM_COPY_SUCCESS,
  CAM_DIALOG_MESSAGE,
  CAM_EXPORT_EMPTY,
  CAM_EXPORT_SUCCESS,
  CAM_IMPORT_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
} from '@/core/copyFeedbackMessages'
import {
  buildTraceCommentLines,
  buildTraceHeaderLines,
  TRACE_NONE_VALUE,
  TRACE_SCHEMA_VERSION,
} from '@/core/traceKeys'
import {
  createSessionPreviewSettingsExportArtifact,
  DEFAULT_SESSION_PREVIEW_LIMIT,
  loadSessionPreviewLimitFromStorage,
  SESSION_PREVIEW_LIMIT_OPTIONS,
  resolveSessionPreviewSettingsPayload,
  saveSessionPreviewLimitToStorage,
} from '@/core/cam/sessionPreviewSettings'
import { canonicalizeCamProcessConfig } from '@/core/cam/camJobSummaryBridge'
import { clonePlain } from '@/core/clonePlain'
import { useExportActions } from '@/composables/useExportActions'
import { useFileImportActions } from '@/composables/useFileImportActions'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'

const router = useRouter()
const store = useCamStore()
const carveraStore = useCarveraStore()
const gridbotStore = useGridBotStore()
const { copyText, exportJson, exportText } = useExportActions()
const { importJsonFromInput, importTextFromInput } = useFileImportActions()
store.loadRecentRuns()

const { device, tools, process, profiles, selectedProfileName, recentRuns } = storeToRefs(store)

const camResult = ref<CamJobResult | null>(null)
const camRunInProgress = ref(false)
const camRunProgress = ref(0)
const camRunProgressLabel = ref('')
const camResultText = computed(() => formatCamResultText(camResult.value))
const camGcodeMotionHint = computed(() => {
  const text = camResult.value?.gcodeText
  if (!text?.trim()) return ''
  return formatCamGcodeMotionLine(summarizeCamGcodeMotion(text))
})

const camGripMotionMatchHint = computed(() => {
  const fb = buildCamPostRunGripFeedback(camResult.value?.gcodeText)
  return fb?.message ?? ''
})

const camGcodePreviewInputRef = ref<HTMLInputElement | null>(null)
const camViewportGcodeOverride = ref('')
const camViewportTool = ref({ x: 0, y: 0, z: 0 })

const camViewportGcode = computed(() => {
  const o = camViewportGcodeOverride.value.trim()
  if (o) return o
  return (camResult.value?.gcodeText ?? '').trim()
})

useGcodePathEndToolPosition(camViewportGcode, camViewportTool)

const camViewportStem = computed(() => {
  const backend = camResult.value?.backend
  if (backend === 'kiri-cam') return 0x67c23a
  if (backend === 'kiri-cam-slice-only') return 0xe6a23c
  if (kiriLegacyReadyForLegacyJob.value) return 0xe6a23c
  return 0x909399
})

const camGcodePresetOverrides = computed(() => ({
  tipColor: camResult.value?.backend === 'kiri-cam' ? 0x67c23a : 0xf56c6c,
}))

const {
  label: kiriLegacyBridgeLabel,
  hintLevel: kiriLegacyHintLevel,
  readyForLegacyJob: kiriLegacyReadyForLegacyJob,
  refresh: refreshKiriLegacyBridgeLabel,
} = useKiriCamLegacyStatus()
const sessionBundleLegacyHintDiffText = ref('')
const sessionBundleResolvedTrace = computed(() => resolveCamSessionBundleTrace(sessionBundlePreview.value))
const sessionBundleSourceFingerprintText = computed(() => sessionBundleResolvedTrace.value.sourceFingerprint)
const sessionBundleSourceLabelText = computed(() => sessionBundleResolvedTrace.value.sourceLabel)

const camExportTraceSourceLabel = computed(() => {
  const runId = diffTargetRunId.value
  const runName = diffTargetRunName.value
  if (runId && runName) return `${runId}:${runName}`
  if (runId) return runId
  const proc = process.value?.processName || 'CAM'
  return `current:${proc}`
})

const camExportTraceSourceFingerprint = computed(() => {
  const fromBundle = sessionBundleSourceFingerprintText.value
  if (fromBundle && fromBundle !== TRACE_NONE_VALUE) return fromBundle
  const gcodeLen = camResult.value?.gcodeText?.length ?? 0
  return `cam.gcodeLength:${gcodeLen}`
})

function buildCamTraceHeaderLines(): string[] {
  return buildTraceHeaderLines(camExportTraceSourceLabel.value, camExportTraceSourceFingerprint.value)
}

function refreshSessionBundleLegacyHintDiffText() {
  const hints = sessionBundlePreview.value?.migrationMeta?.engineHints
  if (!hints) {
    sessionBundleLegacyHintDiffText.value = ''
    return
  }
  const diff = compareCamSessionLegacyHintWithCurrent(hints, getKiriCamLegacyHealth())
  sessionBundleLegacyHintDiffText.value = diff.mismatches.join(', ')
}

async function copySessionBundleLegacyHintDiff() {
  const text = sessionBundleLegacyHintDiffText.value.trim()
  if (!text) {
    ElMessage.info(CAM_COPY_EMPTY.legacyDiff)
    return
  }
  await copyText(text, CAM_COPY_SUCCESS.legacyDiff)
}

async function copySessionBundleTargetLegacyHint() {
  const text = formatCamSessionLegacyTargetHint(sessionBundlePreview.value?.migrationMeta?.engineHints)
  if (!text) {
    ElMessage.info(CAM_COPY_EMPTY.targetLegacy)
    return
  }
  await copyText(text, CAM_COPY_SUCCESS.targetLegacy)
}

async function copySessionCurrentLegacyHealth() {
  const text = formatCamCurrentLegacyHealth(getKiriCamLegacyHealth())
  await copyText(text, CAM_COPY_SUCCESS.currentLegacy)
}

async function copySessionLegacyComparisonBundle() {
  if (!sessionBundlePreview.value) {
    ElMessage.info(CAM_COPY_EMPTY.comparisonBundle)
    return
  }
  const text = buildCamLegacyHintComparisonBundleText({
    hints: sessionBundlePreview.value?.migrationMeta?.engineHints,
    current: getKiriCamLegacyHealth(),
    sourceLabel: sessionBundleSourceLabelText.value,
  })
  await copyText(text, CAM_COPY_SUCCESS.comparisonBundle)
}

async function copySessionBundleSourceFingerprint() {
  const text = sessionBundleSourceFingerprintText.value.trim()
  if (!text || text === TRACE_NONE_VALUE) {
    ElMessage.info(CAM_COPY_EMPTY.sourceFingerprint)
    return
  }
  await copyText(text, CAM_COPY_SUCCESS.sourceFingerprint)
}

async function copySessionBundleSourceLabel() {
  const text = sessionBundleSourceLabelText.value.trim()
  if (!text || text === TRACE_NONE_VALUE) {
    ElMessage.info(CAM_COPY_EMPTY.sourceLabel)
    return
  }
  await copyText(text, CAM_COPY_SUCCESS.sourceLabel)
}

watch(kiriLegacyBridgeLabel, () => refreshSessionBundleLegacyHintDiffText())

const localOps = ref<CamOperationInstance[] | null>(null)
const selectedOpIndex = ref<number | null>(null)
const camPartFileInputRef = ref<HTMLInputElement | null>(null)
const camPartGeometry = ref<CamJobInputGeometry | null>(null)
interface ApplyStateSnapshot {
  deviceName: string | null
  /** Canonical process fields for undo (excludes `ops`; op list is `localOps`). */
  processFull: CamProcessConfig | null
  localOps: CamOperationInstance[] | null
}
interface SessionBundlePreviewData {
  migrationMeta?: {
    schemaVersion?: number
    source?: string
    activeProfile?: string | null
    targetBackend?: string | null
    currentBackend?: string | null
    engineHints?: {
      hasTargetGcode?: boolean
      hasCurrentGcode?: boolean
      diffItemCount?: number
      targetGcodeByteLength?: number
      targetGcodeSha256?: string | null
      targetLegacyReady?: boolean | null
      targetLegacyHasSlice?: boolean | null
      targetLegacyHasExport?: boolean | null
      targetLegacyImportError?: string | null
    }
  }
  targetRun?: {
    id?: string
    name?: string
    createdAt?: number
    geometry?: CamJobInputGeometry
    profile?: {
      device?: {
        deviceName?: string
      } & Record<string, unknown>
      process?: {
        processName?: string
        ops?: CamOperationInstance[]
      } & Record<string, unknown>
    }
    result?: {
      backend?: string
      gcodeText?: string
      legacyDebug?: {
        ready?: boolean
        hasSlice?: boolean
        hasExport?: boolean
        initErrorMessage?: string | null
        legacyImportErrorMessage?: string | null
      }
    }
  }
  diff?: {
    items?: unknown[]
    logs?: unknown[]
  }
}
const diffItems = ref<DiffItem[]>([])
const diffTargetRunName = ref<string>('')
const diffTargetRunId = ref<string | null>(null)
const undoStack = ref<ApplyStateSnapshot[]>([])
const redoStack = ref<ApplyStateSnapshot[]>([])
const diffActionLogs = ref<DiffActionLog[]>([])
const sessionBundlePreview = ref<SessionBundlePreviewData | null>(null)
const sessionPreviewLimit = ref<number>(DEFAULT_SESSION_PREVIEW_LIMIT)
const MAX_HISTORY = 20
const camPartInfoText = computed(() => {
  const g = camPartGeometry.value
  if (!g) return '未导入（将使用 stock 占位 bbox）'
  const dx = g.bbox.maxX - g.bbox.minX
  const dy = g.bbox.maxY - g.bbox.minY
  const dz = g.bbox.maxZ - g.bbox.minZ
  return `${g.id} | ${camGeometryMeshLabel(g)} | bbox ${dx.toFixed(2)} x ${dy.toFixed(2)} x ${dz.toFixed(2)} | complexity=${g.complexityHint}`
})

function loadSessionPreviewLimit() {
  sessionPreviewLimit.value = loadSessionPreviewLimitFromStorage(localStorage)
}

function onChangeSessionPreviewLimit(limit: number) {
  sessionPreviewLimit.value = saveSessionPreviewLimitToStorage(localStorage, limit)
}

function resetSessionPreviewLimit() {
  onChangeSessionPreviewLimit(DEFAULT_SESSION_PREVIEW_LIMIT)
  ElMessage.success(`${CAM_ACTION_SUCCESS.previewLimitResetPrefix}${DEFAULT_SESSION_PREVIEW_LIMIT}项）`)
}

loadSessionPreviewLimit()

onMounted(() => {
  if (!device.value) store.loadSample()
  if (!camResult.value) {
    const last = loadCamLastRunPreview()
    if (last) {
      camPartGeometry.value = last.geometry
      camResult.value = last.result
    }
  }
})

watch(
  () => process.value?.ops,
  (ops) => {
    localOps.value = ops ? ops.map((op) => ({ ...op })) : null
    selectedOpIndex.value = null
  },
  { immediate: true },
)

const effectiveOps = computed<CamOperationInstance[] | null>(() => {
  return localOps.value ?? process.value?.ops ?? null
})

function selectOp(idx: number) {
  selectedOpIndex.value = idx
}

const selectedOp = computed<CamOperationInstance | null>(() => {
  if (selectedOpIndex.value == null) return null
  const ops = effectiveOps.value
  if (!ops) return null
  return ops[selectedOpIndex.value] ?? null
})

function updateSelectedOpField<K extends keyof CamOperationInstance>(key: K, value: CamOperationInstance[K]) {
  if (selectedOpIndex.value == null) return
  if (!localOps.value) {
    const ops = process.value?.ops
    if (!ops) return
    localOps.value = ops.map((op) => ({ ...op }))
  }
  const idx = selectedOpIndex.value
  const ops = localOps.value
  if (!ops || !ops[idx]) return
  ops[idx] = { ...ops[idx], [key]: value }
}

function onLoadSample() {
  store.loadSample()
  camResult.value = null
  ElMessage.success(CAM_ACTION_SUCCESS.loadedSampleProfile)
}

async function onCloneFromCurrent() {
  if (!device.value || !process.value) {
    ElMessage.warning(CAM_ACTION_WARNING.loadConfigBeforeClone)
    return
  }
  try {
    const { value: name } = await ElMessageBox.prompt(CAM_DIALOG_MESSAGE.cloneProfilePrompt, CAM_DIALOG_MESSAGE.cloneProfileTitle, {
      inputPlaceholder: '例如：Aluminum Rough v1',
    })
    if (!name) return
    store.cloneFromCurrent(String(name))
    ElMessage.success(CAM_ACTION_SUCCESS.clonedProfile)
  } catch {
    // cancelled
  }
}

function onResetProfile() {
  store.reset()
  camResult.value = null
  ElMessage.success(CAM_ACTION_SUCCESS.resetProfileEmpty)
}

function onClickImport() {
  const input = document.getElementById('cam-profile-file-input') as HTMLInputElement | null
  input?.click()
}

function onClickImportSessionBundle() {
  const input = document.getElementById('cam-session-bundle-file-input') as HTMLInputElement | null
  input?.click()
}

function onClickImportSessionPreviewSettings() {
  const input = document.getElementById('cam-session-preview-settings-file-input') as HTMLInputElement | null
  input?.click()
}

function onPickCamPartStl() {
  camPartFileInputRef.value?.click()
}

function calcBbox(vertices: Float32Array) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] ?? 0
    const y = vertices[i + 1] ?? 0
    const z = vertices[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

async function onCamPartFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const buf = await file.arrayBuffer()
    const loader = new STLLoader()
    const geometry = loader.parse(buf)
    const attr = geometry.getAttribute('position')
    const arr = attr.array as ArrayLike<number>
    const verts = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 1) verts[i] = arr[i] ?? 0
    const bbox = calcBbox(verts)
    camPartGeometry.value = {
      id: file.name,
      bbox,
      vertices: verts,
      complexityHint: Math.max(1, Math.floor(verts.length / 9)),
    }
    camResult.value = null
    ElMessage.success(`${CAM_ACTION_SUCCESS.importedPartStlPrefix}${file.name}`)
  } catch (err) {
    console.error(err)
    ElMessage.error(CAM_ACTION_ERROR.partStlParseFailed)
  } finally {
    input.value = ''
  }
}

async function onImportProfileFile(event: Event) {
  await importJsonFromInput<string>(event, {
    invalidMessage: CAM_IMPORT_MESSAGE.invalidProfileJson,
    parse: (parsed) => JSON.stringify(parsed),
    onSuccess: (jsonText) => {
      store.importProfileJson(jsonText)
      camResult.value = null
      ElMessage.success(CAM_ACTION_SUCCESS.importProfileJson)
    },
  })
}

async function onImportSessionBundlePreview(event: Event) {
  await importJsonFromInput<SessionBundlePreviewData>(event, {
    invalidMessage: CAM_IMPORT_MESSAGE.invalidSessionBundle,
    readFailedMessage: CAM_IMPORT_MESSAGE.readSessionBundleFailed,
    parse: (parsed) => {
      const data = parsed as SessionBundlePreviewData
      if (!data || typeof data !== 'object' || !data.targetRun || !data.diff) {
        throw new Error('invalid session bundle payload')
      }
      return data
    },
    onSuccess: async (data) => {
      const targetRun = data.targetRun
        ? {
            ...data.targetRun,
            ...(data.targetRun.geometry != null
              ? { geometry: hydrateCamJobGeometry(data.targetRun.geometry as CamJobInputGeometry) }
              : {}),
            ...(data.targetRun.profile != null
              ? {
                  profile: normalizeTargetRunProfileForSessionExport(data.targetRun.profile) as NonNullable<
                    NonNullable<SessionBundlePreviewData['targetRun']>['profile']
                  >,
                }
              : {}),
          }
        : data.targetRun
      const preview: SessionBundlePreviewData = targetRun ? { ...data, targetRun } : data
      sessionBundlePreview.value = preview
      if (preview.targetRun?.geometry) {
        camPartGeometry.value = preview.targetRun.geometry
      }
      if (preview.targetRun?.result) {
        camResult.value = preview.targetRun.result as CamJobResult
        camViewportGcodeOverride.value = ''
      }
      if (preview.targetRun?.id) {
        diffTargetRunId.value = preview.targetRun.id
        diffTargetRunName.value = preview.targetRun.name ?? preview.targetRun.id
        const hit = recentRuns.value.find((r) => r.id === preview.targetRun!.id)
        if (hit) diffItems.value = buildSnapshotDiffItems(hit)
      }
      const legacyHintDiff = compareCamSessionLegacyHintWithCurrent(
        data.migrationMeta?.engineHints,
        getKiriCamLegacyHealth(),
      )
      sessionBundleLegacyHintDiffText.value = legacyHintDiff.mismatches.join(', ')
      const v = await verifyCamSessionBundleGcodeSha256(data)
      if (v.status === 'verify_ok') {
        ElMessage.success(CAM_ACTION_SUCCESS.sessionBundlePreviewVerified)
      } else if (v.status === 'verify_mismatch') {
        ElMessage.success(CAM_ACTION_SUCCESS.sessionBundlePreviewLoadedReadonly)
        ElMessage.error(CAM_ACTION_ERROR.sessionBundleGcodeShaMismatch)
      } else if (v.status === 'cannot_verify_no_gcode') {
        ElMessage.success(CAM_ACTION_SUCCESS.sessionBundlePreviewLoadedReadonly)
        ElMessage.warning(CAM_ACTION_WARNING.sessionBundleNoEmbeddedGcode)
      } else {
        ElMessage.success(CAM_ACTION_SUCCESS.sessionBundlePreviewLoadedReadonly)
      }
      if (legacyHintDiff.mismatches.length) {
        ElMessage.warning(`${CAM_ACTION_WARNING.sessionBundleLegacyHintMismatchPrefix}${legacyHintDiff.mismatches.join(', ')}`)
      }
    },
  })
}

async function onImportSessionPreviewSettings(event: Event) {
  await importJsonFromInput<unknown>(event, {
    invalidMessage: CAM_IMPORT_MESSAGE.invalidPreviewSettings,
    readFailedMessage: CAM_IMPORT_MESSAGE.readPreviewSettingsFailed,
    parse: (parsed) => parsed,
    onSuccess: (parsed) => {
      const resolved = resolveSessionPreviewSettingsPayload(parsed)
      if (resolved.warning) ElMessage.warning(resolved.warning)
      onChangeSessionPreviewLimit(resolved.previewLimit)
      ElMessage.success(CAM_ACTION_SUCCESS.importPreviewSettings)
    },
  })
}

function sessionBundleProfileSlice(preview: SessionBundlePreviewData) {
  const p = preview.targetRun!.profile!
  return {
    device: p.device,
    process: p.process as Record<string, unknown> & { ops?: CamOperationInstance[] },
  }
}

function applySessionBundleFieldCore(field: SessionApplyField, preview: SessionBundlePreviewData): boolean {
  const profile = sessionBundleProfileSlice(preview)
  const mutableState = {
    device: device.value as unknown as Record<string, unknown>,
    process: process.value as unknown as Record<string, unknown>,
    localOps: localOps.value,
  }
  const applied = applySessionFieldToState(field, profile, mutableState)
  if (!applied.applied) return false
  localOps.value = mutableState.localOps
  if (field === 'ops') selectedOpIndex.value = null
  pushDiffLog('apply', `bundle:${field}`)
  return true
}

function refreshDiffAfterSessionApply() {
  camResult.value = null
  const hit = diffTargetRunId.value ? recentRuns.value.find((r) => r.id === diffTargetRunId.value) : null
  if (hit) diffItems.value = buildSnapshotDiffItems(hit)
}

async function applySessionBundleField(field: SessionApplyField) {
  const preview = sessionBundlePreview.value
  if (!preview?.targetRun?.profile || !device.value || !process.value) {
    ElMessage.warning(CAM_ACTION_WARNING.cannotApplySessionField)
    return
  }
  const profile = sessionBundleProfileSlice(preview)
  if (!canBuildSessionApplyPreview(field, profile)) {
    ElMessage.warning(CAM_ACTION_WARNING.sessionBundleMissingField)
    return
  }
  const applyPreview = buildSessionApplyPreview({
    field,
    profile,
    currentDevice: device.value as unknown as Record<string, unknown>,
    currentProcess: process.value as unknown as Record<string, unknown>,
    currentOps: localOps.value ?? process.value.ops ?? [],
    previewLimit: sessionPreviewLimit.value,
  })
  try {
    await ElMessageBox.confirm(applyPreview.confirmMessage, CAM_DIALOG_MESSAGE.applySessionFieldTitle, {
      type: 'warning',
      confirmButtonText: CAM_DIALOG_MESSAGE.confirmApplyButton,
      cancelButtonText: CAM_DIALOG_MESSAGE.cancelButton,
    })
  } catch {
    return
  }
  const before = captureApplyState()
  if (before) {
    const next = pushUndoAndClearRedo({ undoStack: undoStack.value, redoStack: redoStack.value }, before, MAX_HISTORY)
    undoStack.value = next.undoStack
    redoStack.value = next.redoStack
  }
  if (!applySessionBundleFieldCore(field, preview)) {
    ElMessage.warning(CAM_ACTION_WARNING.sessionBundleApplyFailedIncompatible)
    return
  }
  refreshDiffAfterSessionApply()
  ElMessage.success(`${CAM_ACTION_SUCCESS.applySessionFieldPrefix}${field}`)
}

async function applySessionBundleAll() {
  const preview = sessionBundlePreview.value
  if (!preview?.targetRun?.profile || !device.value || !process.value) {
    ElMessage.warning(CAM_ACTION_WARNING.cannotApplySessionField)
    return
  }
  const profile = sessionBundleProfileSlice(preview)
  const applyPreview = buildSessionApplyAllPreview({
    profile,
    currentDevice: device.value as unknown as Record<string, unknown>,
    currentProcess: process.value as unknown as Record<string, unknown>,
    currentOps: localOps.value ?? process.value.ops ?? [],
    previewLimit: sessionPreviewLimit.value,
  })
  if (applyPreview.changeCount === 0) {
    ElMessage.info('会话包与当前配置无差异，无需应用')
    return
  }
  try {
    await ElMessageBox.confirm(applyPreview.confirmMessage, CAM_DIALOG_MESSAGE.applySessionFieldTitle, {
      type: 'warning',
      confirmButtonText: CAM_DIALOG_MESSAGE.confirmApplyButton,
      cancelButtonText: CAM_DIALOG_MESSAGE.cancelButton,
    })
  } catch {
    return
  }
  const before = captureApplyState()
  if (before) {
    const next = pushUndoAndClearRedo({ undoStack: undoStack.value, redoStack: redoStack.value }, before, MAX_HISTORY)
    undoStack.value = next.undoStack
    redoStack.value = next.redoStack
  }
  const fields: SessionApplyField[] = ['device', 'process', 'ops']
  for (const field of fields) {
    if (!canBuildSessionApplyPreview(field, profile)) continue
    if (!applySessionBundleFieldCore(field, preview)) {
      ElMessage.warning(CAM_ACTION_WARNING.sessionBundleApplyFailedIncompatible)
      return
    }
  }
  refreshDiffAfterSessionApply()
  ElMessage.success(CAM_ACTION_SUCCESS.applySessionBundleAll)
}

async function onRunCamJob() {
  if (!device.value || !process.value) {
    ElMessage.warning(CAM_ACTION_WARNING.loadCompleteConfigBeforeRun)
    return
  }

  const ops = effectiveOps.value ?? process.value.ops ?? []
  if (!ops.filter((op) => !op.disabled).length) {
    ElMessage.warning('请至少配置一条未禁用的 CAM 工序（ops）')
    return
  }

  const proc = canonicalizeCamProcessConfig({
    ...process.value,
    ops,
  } as CamProcessConfig)

  const profile = {
    device: device.value,
    tools: tools.value,
    process: proc,
  }

  const p = proc
  const stockX = p.camStockX ?? 100
  const stockY = p.camStockY ?? 100
  const stockZ = p.camStockZ ?? 10

  const geometry = camPartGeometry.value ?? {
    id: 'placeholder-stock',
    bbox: {
      minX: -stockX / 2,
      maxX: stockX / 2,
      minY: -stockY / 2,
      maxY: stockY / 2,
      minZ: 0,
      maxZ: stockZ,
    },
    complexityHint: 1,
  }

  camRunInProgress.value = true
  camRunProgress.value = 0
  camRunProgressLabel.value = 'cam_slice'
  try {
    const result = await runCamJob(profile, geometry, {
      onSliceProgress: (prog, msg) => {
        const p = Number(prog)
        if (Number.isFinite(p)) {
          camRunProgress.value = Math.round(Math.min(1, Math.max(0, p)) * 100)
        }
        if (msg) camRunProgressLabel.value = msg
      },
    })
    camResult.value = result
    saveCamLastRunPreview(result, geometry)
    const ts = Date.now()
    const run: CamRunSnapshot = {
      id: `cam-run-${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: ts,
      name: `${proc.processName || 'CAM'}-${result.backend}`,
      profile: {
        device: clonePlain(profile.device),
        tools: clonePlain(profile.tools),
        process: clonePlain(profile.process),
      },
      geometry: clonePlain(geometry),
      result: clonePlain(result),
    }
    store.addRecentRun(run)
    ElMessage.success(`${CAM_ACTION_SUCCESS.runCamJobPrefix}${result.backend}）`)
    const gripFb = buildCamPostRunGripFeedback(result.gcodeText)
    if (gripFb?.level === 'success') ElMessage.success(gripFb.message)
    else if (gripFb?.level === 'warning') ElMessage.warning(gripFb.message)
  } catch (err) {
    console.error(err)
    ElMessage.error(CAM_ACTION_ERROR.runCamJobFailed)
  } finally {
    camRunInProgress.value = false
    camRunProgress.value = 0
    camRunProgressLabel.value = ''
    refreshKiriLegacyBridgeLabel()
  }
}

function onExportSessionPreviewSettings() {
  const artifact = createSessionPreviewSettingsExportArtifact(sessionPreviewLimit.value)
  exportText(artifact.filename, artifact.json, CAM_EXPORT_SUCCESS.previewSettings)
}

async function onCopyCamGcode() {
  const raw = camResult.value?.gcodeText
  if (!raw) return
  const { text, truncated } = camGcodeForClipboard(raw)
  await copyText(text, truncated ? '已复制 G-code（已截断）' : '已复制 G-code')
}

function onDownloadGcode() {
  const text = camResult.value?.gcodeText
  if (!text) return
  const trace = buildTraceCommentLines(camExportTraceSourceLabel.value, camExportTraceSourceFingerprint.value).join('\n')
  const withTrace = `${trace}\n${text}`
  const name = `cam-job-${new Date().toISOString().replace(/[:.]/g, '-')}.gcode`
  exportText(name, withTrace, CAM_EXPORT_SUCCESS.gcode, 'text/plain;charset=utf-8')
}

function onPickCamGcodePreview() {
  camGcodePreviewInputRef.value?.click()
}

function onClearCamGcodePreviewOverride() {
  camViewportGcodeOverride.value = ''
}

function onLoadGripFixturePreview() {
  camViewportGcodeOverride.value = getGripCamFixturePreviewGcode()
  ElMessage.success('已载入 grip CAM 金样 G-code 预览')
}

async function onCopyCamFixtureSha() {
  await copyText(buildCamGripFixtureDevHint(), '已复制 CAM fixture SHA 说明')
}

function onCompareCamMotionToFixture() {
  const g = camResult.value?.gcodeText?.trim() || camViewportGcode.value?.trim()
  if (!g) {
    ElMessage.info('请先生成 CAM 刀路或载入 G-code 预览')
    return
  }
  const r = compareCamMotionToGripFixture(g)
  if (r.match) ElMessage.success(r.detail)
  else ElMessage.warning(r.detail)
}

async function onCamGcodePreviewFile(e: Event) {
  await importTextFromInput(e, {
    readFailedMessage: '读取文件失败',
    onSuccess: (text) => {
      camViewportGcodeOverride.value = text
      ElMessage.success('已载入 G-code 预览覆盖')
    },
  })
}

function onSaveToCarvera() {
  const text = camResult.value?.gcodeText
  if (!text) {
    ElMessage.warning(CAM_ACTION_WARNING.noGcodeToSave)
    return
  }

  const job = createCarveraJobFromBridgeGcode({
    mode: 'CAM',
    gcodeText: text,
    namePrefix: 'cam',
    device: device.value?.deviceName ?? null,
    process: process.value?.processName ?? null,
    traceCommentLines: buildTraceCommentLines(
      camExportTraceSourceLabel.value,
      camExportTraceSourceFingerprint.value,
    ),
  })
  void carveraStore.addJob(job)
  router.push('/carvera')
  ElMessage.success(CAM_ACTION_SUCCESS.savedCarveraJobLocal)
}

function onSaveToGridBot() {
  const text = camResult.value?.gcodeText
  if (!text) {
    ElMessage.warning(CAM_ACTION_WARNING.noGcodeToSave)
    return
  }

  const job = createGridBotJobFromBridgeGcode({
    mode: 'CAM',
    gcodeText: text,
    namePrefix: 'cam',
    device: device.value?.deviceName ?? null,
    process: process.value?.processName ?? null,
    traceCommentLines: buildTraceCommentLines(
      camExportTraceSourceLabel.value,
      camExportTraceSourceFingerprint.value,
    ),
  })
  void gridbotStore.saveJob(job)
  router.push('/gridbot')
  ElMessage.success(CAM_ACTION_SUCCESS.savedGridBotJobLocal)
}

function onExportProfile() {
  const json = store.exportProfile()
  const name = `cam-profile-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  exportText(name, json, CAM_EXPORT_SUCCESS.profileJson)
}

function onExportProfileWithLocalOps() {
  if (!device.value || !process.value) {
    ElMessage.warning(CAM_EXPORT_EMPTY.profileWithLocalOps)
    return
  }

  const proc = canonicalizeCamProcessConfig({
    ...process.value,
    ops: effectiveOps.value ?? process.value.ops,
  } as CamProcessConfig)

  const payload = {
    device: device.value,
    tools: tools.value,
    process: proc,
  }

  const name = `cam-profile-local-ops-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  exportJson(name, payload, CAM_EXPORT_SUCCESS.profileJsonWithLocalOps)
}

function onLoadRecentRun(id: string) {
  const hit = recentRuns.value.find((r) => r.id === id)
  if (!hit) return
  store.loadRunSnapshot(hit)
  localOps.value = hit.profile.process.ops ? hit.profile.process.ops.map((op) => ({ ...op })) : null
  camPartGeometry.value = hydrateCamJobGeometry(hit.geometry)
  camResult.value = hit.result
  ElMessage.success(CAM_ACTION_SUCCESS.loadedRunSnapshot)
}

function onClearRecentRuns() {
  store.clearRecentRuns()
  diffItems.value = []
  diffTargetRunName.value = ''
  diffTargetRunId.value = null
  undoStack.value = []
  redoStack.value = []
  diffActionLogs.value = []
  ElMessage.info(CAM_ACTION_SUCCESS.clearedRunHistory)
}

function pushDiffLog(action: DiffActionLog['action'], field: string) {
  diffActionLogs.value = appendDiffActionLog(diffActionLogs.value, action, field)
}

function onExportDiffLogs() {
  if (!diffActionLogs.value.length) return
  const artifact = createDiffLogExportArtifact(
    diffTargetRunName.value || null,
    diffTargetRunId.value,
    diffActionLogs.value,
    {
      sourceLabel: camExportTraceSourceLabel.value,
      sourceFingerprint: camExportTraceSourceFingerprint.value,
    },
  )
  exportText(artifact.filename, artifact.json, CAM_EXPORT_SUCCESS.diffActionLog)
}

async function onExportCamSessionBundle() {
  const target = diffTargetRunId.value ? recentRuns.value.find((r) => r.id === diffTargetRunId.value) : null
  if (!target) {
    ElMessage.warning(CAM_EXPORT_EMPTY.sessionBundle)
    return
  }
  try {
    const artifact = await createCamSessionBundleExportArtifact({
      targetRun: {
        id: target.id,
        name: target.name,
        createdAt: target.createdAt,
        geometry: target.geometry,
        result: target.result,
        profile: target.profile,
      },
      selectedProfileName: selectedProfileName.value ?? null,
      currentDevice: device.value,
      currentProcessName: process.value?.processName ?? null,
      currentOpsCount: (localOps.value ?? process.value?.ops ?? []).length,
      hasCurrentResult: !!camResult.value,
      currentBackend: camResult.value?.backend ?? null,
      diffTargetRunName: diffTargetRunName.value || null,
      diffItems: diffItems.value,
      diffLogs: diffActionLogs.value,
      traceSourceLabel: camExportTraceSourceLabel.value,
      traceSourceFingerprint: camExportTraceSourceFingerprint.value,
    })
    exportText(artifact.filename, artifact.json, CAM_EXPORT_SUCCESS.sessionBundle)
  } catch (e) {
    console.error(e)
    ElMessage.error(`${CAM_ACTION_ERROR.exportFailedPrefix}${(e as Error).message || UNKNOWN_ERROR_MESSAGE}`)
  }
}

function captureApplyState(): ApplyStateSnapshot | null {
  if (!device.value || !process.value) return null
  const processFull = clonePlain(process.value) as CamProcessConfig & { ops?: CamOperationInstance[] }
  delete processFull.ops
  return {
    deviceName: device.value.deviceName ?? null,
    processFull,
    localOps: localOps.value ? localOps.value.map((op) => ({ ...op })) : null,
  }
}

function applyStateSnapshot(state: ApplyStateSnapshot) {
  if (!device.value || !process.value) return
  if (state.deviceName != null) device.value.deviceName = state.deviceName
  if (state.processFull) {
    const incoming = clonePlain(state.processFull) as CamProcessConfig & { ops?: CamOperationInstance[] }
    delete incoming.ops
    const cur = process.value as Record<string, unknown>
    for (const k of Object.keys(cur)) {
      if (k === 'ops') continue
      delete cur[k]
    }
    Object.assign(cur, incoming)
  }
  localOps.value = state.localOps ? state.localOps.map((op) => ({ ...op })) : null
  selectedOpIndex.value = null
}

function buildSnapshotDiffItems(run: CamRunSnapshot): DiffItem[] {
  const curDevice = device.value
  const curProcess = process.value
  if (!curDevice || !curProcess) return []
  return buildSessionSnapshotDiffItems({
    current: {
      deviceName: curDevice.deviceName,
      process: curProcess,
      localOps: localOps.value,
    },
    snapshot: {
      deviceName: run.profile.device.deviceName,
      process: run.profile.process,
    },
  })
}

function onCompareRecentRun(id: string) {
  const hit = recentRuns.value.find((r) => r.id === id)
  if (!hit) return
  diffTargetRunName.value = hit.name
  diffTargetRunId.value = hit.id
  diffItems.value = buildSnapshotDiffItems(hit)
  if (diffItems.value.length) ElMessage.success(`${CAM_ACTION_SUCCESS.diffGeneratedPrefix}${diffItems.value.length} 项）`)
  else ElMessage.info(CAM_ACTION_SUCCESS.diffNoChanges)
}

function onApplyDiffItem(item: DiffItem) {
  const hit = diffTargetRunId.value ? recentRuns.value.find((r) => r.id === diffTargetRunId.value) : null
  if (!hit || !device.value || !process.value) return
  const before = captureApplyState()
  if (before) {
    const next = pushUndoAndClearRedo({ undoStack: undoStack.value, redoStack: redoStack.value }, before, MAX_HISTORY)
    undoStack.value = next.undoStack
    redoStack.value = next.redoStack
  }
  const mutableState = { device: device.value, process: process.value, localOps: localOps.value }
  const applied = applyDiffKeyToState(
    item.key,
    {
      deviceName: hit.profile.device.deviceName,
      process: canonicalizeCamProcessConfig(hit.profile.process as CamProcessConfig),
    },
    mutableState,
  )
  if (!applied.applied) {
    ElMessage.warning(CAM_ACTION_WARNING.applyDiffFailedIncompatible)
    return
  }
  localOps.value = mutableState.localOps
  if (applied.resetSelectedOp) selectedOpIndex.value = null
  camResult.value = null
  diffItems.value = buildSnapshotDiffItems(hit)
  pushDiffLog('apply', item.label)
  ElMessage.success(`${CAM_ACTION_SUCCESS.applyFieldPrefix}${item.label}`)
}

function onUndoApply() {
  const curr = captureApplyState()
  const { nextState, target } = popUndoWithCurrentToRedo(
    { undoStack: undoStack.value, redoStack: redoStack.value },
    curr,
    MAX_HISTORY,
  )
  undoStack.value = nextState.undoStack
  redoStack.value = nextState.redoStack
  if (!target) return
  applyStateSnapshot(target)
  const hit = diffTargetRunId.value ? recentRuns.value.find((r) => r.id === diffTargetRunId.value) : null
  if (hit) diffItems.value = buildSnapshotDiffItems(hit)
  camResult.value = null
  pushDiffLog('undo', 'state')
  ElMessage.success(CAM_ACTION_SUCCESS.undoApplied)
}

function onRedoApply() {
  const curr = captureApplyState()
  const { nextState, target } = popRedoWithCurrentToUndo(
    { undoStack: undoStack.value, redoStack: redoStack.value },
    curr,
    MAX_HISTORY,
  )
  undoStack.value = nextState.undoStack
  redoStack.value = nextState.redoStack
  if (!target) return
  applyStateSnapshot(target)
  const hit = diffTargetRunId.value ? recentRuns.value.find((r) => r.id === diffTargetRunId.value) : null
  if (hit) diffItems.value = buildSnapshotDiffItems(hit)
  camResult.value = null
  pushDiffLog('redo', 'state')
  ElMessage.success(CAM_ACTION_SUCCESS.redoApplied)
}

async function onSaveRecentRunAsProfile(id: string) {
  const hit = recentRuns.value.find((r) => r.id === id)
  if (!hit) return
  try {
    const defaultName = `${hit.profile.process.processName || 'CAM'}-snapshot`
    const { value } = await ElMessageBox.prompt(
      CAM_DIALOG_MESSAGE.saveSnapshotProfilePrompt,
      CAM_DIALOG_MESSAGE.saveSnapshotProfileTitle,
      {
      inputValue: defaultName,
      inputPlaceholder: '例如：Aluminum Rough v2',
      },
    )
    const name = String(value || '').trim()
    if (!name) return
    store.importProfile(
      {
        device: clonePlain(hit.profile.device),
        tools: clonePlain(hit.profile.tools),
        process: clonePlain(hit.profile.process),
      },
      name,
    )
    ElMessage.success(`${CAM_ACTION_SUCCESS.savedProfileAsPrefix}${name}`)
  } catch {
    // cancelled
  }
}
</script>

<style scoped>
.cam-root {
  height: calc(100vh - 60px);
}
.cam-aside,
.cam-aside-right {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.cam-aside-right {
  border-left: 1px solid #dcdfe6;
  border-right: none;
}
.cam-center {
  background: #f5f7fa;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cam-main {
  padding: 12px;
}
.cam-main-center {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.pane-title {
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}
.pane-body {
  padding: 12px;
}
.hint {
  color: #909399;
}
.tool-list,
.ops-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
}
.tool-item,
.ops-item {
  margin-bottom: 4px;
}
</style>
