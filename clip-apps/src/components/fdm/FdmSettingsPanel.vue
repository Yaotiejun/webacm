<template>
  <div class="km-panel-scroll">
    <details class="km-set-group" open>
      <summary class="km-set-header">machine / profile</summary>
      <div class="km-set-body">
        <div class="km-row">
          <label>Machine</label>
          <select class="km-ctrl" :value="device" @change="onDeviceChange">
            <optgroup v-if="localDevices.length" label="My Devices">
              <option v-for="d in localDevices" :key="`l-${d}`" :value="d">{{ d }}</option>
            </optgroup>
            <optgroup v-if="featuredStockDevices.length" label="Featured">
              <option v-for="d in featuredStockDevices" :key="`f-${d}`" :value="d">{{ d }}</option>
            </optgroup>
            <optgroup v-if="otherStockDevices.length" label="Stock Devices">
              <option v-for="d in otherStockDevices" :key="`s-${d}`" :value="d">{{ d }}</option>
            </optgroup>
          </select>
        </div>
        <div class="km-row">
          <label>Profile</label>
          <select class="km-ctrl" :value="process" @change="onProcessChange">
            <optgroup v-if="localProcesses.length" label="My Profiles">
              <option v-for="p in localProcesses" :key="`lp-${p}`" :value="p">{{ p }}</option>
            </optgroup>
            <optgroup label="Stock">
              <option v-for="p in stockProcesses" :key="`sp-${p}`" :value="p">{{ p }}</option>
            </optgroup>
          </select>
        </div>
        <div class="km-row">
          <label>Material</label>
          <select class="km-ctrl" :value="material" @change="onMaterialChange">
            <option v-for="m in materials" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
      </div>
    </details>

    <details class="km-set-group" open>
      <summary class="km-set-header">layers</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Layer height</label>
          <input class="km-ctrl" type="number" step="0.01" min="0.01" :value="proc.sliceHeight" @change="num('sliceHeight', $event)" />
        </div>
        <div class="km-row">
          <label>Layer minimum</label>
          <input class="km-ctrl" type="number" step="0.01" min="0" :value="proc.sliceMinHeight ?? 0" @change="num('sliceMinHeight', $event)" />
        </div>
        <div class="km-row">
          <label>Top layers</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.sliceTopLayers" @change="num('sliceTopLayers', $event)" />
        </div>
        <div class="km-row">
          <label>Base layers</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.sliceBottomLayers" @change="num('sliceBottomLayers', $event)" />
        </div>
        <div class="km-row">
          <label>Adaptive height</label>
          <input type="checkbox" :checked="!!proc.sliceAdaptive" @change="bool('sliceAdaptive', $event)" />
        </div>
      </div>
      <div v-else class="km-set-body km-hint">No process loaded</div>
    </details>

    <details class="km-set-group" open>
      <summary class="km-set-header">shells</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Shell count</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.sliceShells" @change="num('sliceShells', $event)" />
        </div>
        <div class="km-row">
          <label>Line width</label>
          <input class="km-ctrl" type="number" step="0.01" min="0.1" :value="proc.sliceLineWidth" @change="num('sliceLineWidth', $event)" />
        </div>
        <div class="km-row">
          <label>Fill overlap</label>
          <input class="km-ctrl" type="number" step="0.01" min="0" :value="proc.sliceFillOverlap" @change="num('sliceFillOverlap', $event)" />
        </div>
        <div class="km-row">
          <label>Thin walls</label>
          <select class="km-ctrl" :value="String(proc.sliceDetectThin ?? 0)" @change="thinWallChange">
            <option value="0">off</option>
            <option value="1">basic</option>
            <option value="2">adaptive</option>
          </select>
        </div>
        <div class="km-row">
          <label>Inner offset</label>
          <input class="km-ctrl" type="number" step="0.01" :value="proc.sliceCompInner ?? 0" @change="num('sliceCompInner', $event)" />
        </div>
        <div class="km-row">
          <label>Outer offset</label>
          <input class="km-ctrl" type="number" step="0.01" :value="proc.sliceCompOuter ?? 0" @change="num('sliceCompOuter', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">solid fill</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Shell factor</label>
          <input class="km-ctrl" type="number" step="0.05" min="0" :value="proc.outputShellMult ?? 1" @change="num('outputShellMult', $event)" />
        </div>
        <div class="km-row">
          <label>Solid factor</label>
          <input class="km-ctrl" type="number" step="0.05" min="0" :value="proc.outputFillMult ?? 1" @change="num('outputFillMult', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">sparse fill</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Fill type</label>
          <select class="km-ctrl" :value="proc.sliceFillType" @change="str('sliceFillType', $event)">
            <option value="none">none</option>
            <option value="grid">grid</option>
            <option value="linear">linear</option>
            <option value="hex">hex</option>
            <option value="triangle">triangle</option>
            <option value="gyroid">gyroid</option>
            <option value="vase">vase</option>
          </select>
        </div>
        <div class="km-row">
          <label>Fill amount</label>
          <input class="km-ctrl" type="number" step="0.05" min="0" max="1" :value="proc.sliceFillSparse" @change="num('sliceFillSparse', $event)" />
        </div>
        <div class="km-row">
          <label>Infill factor</label>
          <input class="km-ctrl" type="number" step="0.05" min="0" :value="proc.outputSparseMult ?? 1" @change="num('outputSparseMult', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">first layer</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Layer height</label>
          <input class="km-ctrl" type="number" step="0.01" min="0.01" :value="proc.firstSliceHeight" @change="num('firstSliceHeight', $event)" />
        </div>
        <div class="km-row">
          <label>Nozzle temp</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.firstLayerNozzleTemp" @change="num('firstLayerNozzleTemp', $event)" />
        </div>
        <div class="km-row">
          <label>Bed temp</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.firstLayerBedTemp" @change="num('firstLayerBedTemp', $event)" />
        </div>
        <div class="km-row">
          <label>Print speed</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.firstLayerRate" @change="num('firstLayerRate', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">heating</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Nozzle temp</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.outputTemp" @change="num('outputTemp', $event)" />
        </div>
        <div class="km-row">
          <label>Bed temp</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.outputBedTemp" @change="num('outputBedTemp', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">cooling</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Fan on layer</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.outputFanLayer" @change="num('outputFanLayer', $event)" />
        </div>
        <div class="km-row">
          <label>Fan on speed</label>
          <input class="km-ctrl" type="number" step="1" min="0" max="255" :value="proc.outputFanSpeed" @change="num('outputFanSpeed', $event)" />
        </div>
        <div class="km-row">
          <label>Min layer time</label>
          <input class="km-ctrl" type="number" step="0.1" min="0" :value="proc.outputMinLayerTime" @change="num('outputMinLayerTime', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">base</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Brim enable</label>
          <input type="checkbox" :checked="!!proc.enableBrim" @change="bool('enableBrim', $event)" />
        </div>
        <div class="km-row">
          <label>Brim sides</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.brimCount ?? 0" @change="num('brimCount', $event)" />
        </div>
        <div class="km-row">
          <label>Brim gap</label>
          <input class="km-ctrl" type="number" step="0.1" min="0" :value="proc.brimOffset ?? 0" @change="num('brimOffset', $event)" />
        </div>
        <div class="km-row">
          <label>Raft enable</label>
          <input type="checkbox" :checked="!!proc.enableRaft" @change="bool('enableRaft', $event)" />
        </div>
        <div class="km-row">
          <label>Raft gap</label>
          <input class="km-ctrl" type="number" step="0.1" min="0" :value="proc.raftSpacing ?? 0" @change="num('raftSpacing', $event)" />
        </div>
      </div>
    </details>

    <details class="km-set-group">
      <summary class="km-set-header">support</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Enable</label>
          <input type="checkbox" :checked="!!proc.sliceSupportEnable" @change="bool('sliceSupportEnable', $event)" />
        </div>
        <div class="km-row">
          <label>Density</label>
          <input class="km-ctrl" type="number" step="0.05" min="0" max="1" :value="proc.sliceSupportDensity" @change="num('sliceSupportDensity', $event)" />
        </div>
        <div class="km-row">
          <label>Angle</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.sliceSupportAngle" @change="num('sliceSupportAngle', $event)" />
        </div>
        <div class="km-row">
          <label>Part offset</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.sliceSupportOffset" @change="num('sliceSupportOffset', $event)" />
        </div>
        <div class="km-row">
          <label>Pillar size</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.sliceSupportSize" @change="num('sliceSupportSize', $event)" />
        </div>
        <div class="km-row">
          <label>Layer gap</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.sliceSupportZGap ?? 0" @change="num('sliceSupportZGap', $event)" />
        </div>
        <div class="km-row">
          <label>Expand</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.sliceSupportXYExpand ?? 0" @change="num('sliceSupportXYExpand', $event)" />
        </div>
        <div class="km-row">
          <label>Interface layers</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.sliceSupportInterfaceLayers ?? 0" @change="num('sliceSupportInterfaceLayers', $event)" />
        </div>
        <div class="km-row">
          <label>Outline only</label>
          <input type="checkbox" :checked="!!proc.sliceSupportOutlineOnly" @change="bool('sliceSupportOutlineOnly', $event)" />
        </div>
        <div class="km-row">
          <label>Support mode</label>
          <select
            class="km-ctrl"
            :value="proc.sliceSupportType || (proc.sliceSupportEnable ? 'automatic' : 'disabled')"
            @change="str('sliceSupportType', $event)"
          >
            <option value="automatic">automatic</option>
            <option value="manual">manual (paint)</option>
            <option value="disabled">disabled</option>
          </select>
        </div>
        <div class="km-row">
          <label>Support extruder</label>
          <input class="km-ctrl" type="number" step="1" min="0" :value="proc.sliceSupportNozzle ?? 0" @change="num('sliceSupportNozzle', $event)" />
        </div>
      </div>
    </details>

    <details v-if="deviceIsBelt" class="km-set-group" open>
      <summary class="km-set-header">belt (CR-30)</summary>
      <div class="km-set-body" v-if="proc">
        <p class="km-hint">Device bedBelt=true — angle/anchor used in slice pre-pass; bump/fact in first-layer belt path.</p>
        <div class="km-row">
          <label>Slice angle °</label>
          <input
            class="km-ctrl"
            type="number"
            step="1"
            min="0"
            max="90"
            :value="proc.sliceAngle ?? 45"
            @change="num('sliceAngle', $event)"
            title="Kiri sliceAngle — belt incline"
          />
        </div>
        <div class="km-row">
          <label>Belt anchor</label>
          <input
            class="km-ctrl"
            type="number"
            step="0.5"
            min="0"
            :value="proc.beltAnchor ?? 0"
            @change="num('beltAnchor', $event)"
            title="Kiri beltAnchor (mm)"
          />
        </div>
        <div class="km-row">
          <label>Belt lead</label>
          <input
            class="km-ctrl"
            type="number"
            step="0.5"
            min="0"
            :value="proc.firstLayerBeltLead ?? 0"
            @change="num('firstLayerBeltLead', $event)"
            title="Kiri firstLayerBeltLead (mm); used if beltAnchor=0"
          />
        </div>
        <div class="km-row">
          <label>Belt bump</label>
          <input
            class="km-ctrl"
            type="number"
            step="0.5"
            min="0"
            max="10"
            :value="proc.firstLayerBeltBump ?? 0"
            @change="num('firstLayerBeltBump', $event)"
            title="Kiri firstLayerBeltBump — anchor bump height (mm)"
          />
        </div>
        <div class="km-row">
          <label>Belt fact</label>
          <input
            class="km-ctrl"
            type="number"
            step="0.05"
            min="0"
            max="2"
            :value="proc.firstLayerBeltFact ?? 1"
            @change="num('firstLayerBeltFact', $event)"
            title="Kiri firstLayerBeltFact — first-layer extrusion multiplier on belt"
          />
        </div>
      </div>
    </details>

    <details class="km-set-group" open>
      <summary class="km-set-header">output</summary>
      <div class="km-set-body" v-if="proc">
        <div class="km-row">
          <label>Print speed</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.outputFeedrate" @change="num('outputFeedrate', $event)" />
        </div>
        <div class="km-row">
          <label>Move speed</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.outputSeekrate" @change="num('outputSeekrate', $event)" />
        </div>
        <div class="km-row">
          <label>Retract distance</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.outputRetractDist" @change="num('outputRetractDist', $event)" />
        </div>
        <div class="km-row">
          <label>Retract rate</label>
          <input class="km-ctrl" type="number" step="1" :value="proc.outputRetractSpeed" @change="num('outputRetractSpeed', $event)" />
        </div>
        <div class="km-row">
          <label>Z hop</label>
          <input class="km-ctrl" type="number" step="0.1" :value="proc.zHopDistance" @change="num('zHopDistance', $event)" />
        </div>
        <div class="km-row">
          <label>Purge tower</label>
          <input
            class="km-ctrl"
            type="number"
            step="1"
            min="0"
            :value="proc.outputPurgeTower ?? 0"
            @change="num('outputPurgeTower', $event)"
            title="Kiri outputPurgeTower (area); 0 disables"
          />
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getFdmDevice, listFdmDevices } from '@/api/devices'
import { listFdmProcesses, saveFdmProcess } from '@/api/process'
import { listFdmMaterials } from '@/api/material'
import { setCurrentDevice, setCurrentMaterial, setCurrentProcess } from '@/api/current'
import type { FdmProcess } from '@/types/process'
import { clonePlain } from '@/core/clonePlain'
import {
  getStockFdmDevice,
  listStockFdmDeviceIdsGrouped,
  resolveStockFdmDeviceId,
} from '@/core/slicer/stock/fdm/stockFdmDevices'

const props = defineProps<{
  device: string
  process: string
  material: string
  proc: FdmProcess | null
}>()

const emit = defineEmits<{
  changed: []
  'update:proc': [proc: FdmProcess]
}>()

const stockDevices = ref<string[]>([])
const localDevices = ref<string[]>([])
const stockProcesses = ref<string[]>([])
const localProcesses = ref<string[]>([])
const materials = ref<string[]>(['PLA'])
const deviceIsBelt = ref(false)

const featuredIdSet = new Set(listStockFdmDeviceIdsGrouped().featured)
const featuredStockDevices = computed(() => stockDevices.value.filter((d) => featuredIdSet.has(d)))
const otherStockDevices = computed(() => stockDevices.value.filter((d) => !featuredIdSet.has(d)))

let saveTimer: ReturnType<typeof setTimeout> | null = null

async function refreshDeviceBeltFlag() {
  const name = props.device
  if (!name) {
    deviceIsBelt.value = false
    return
  }
  try {
    const d = await getFdmDevice(name)
    if (d && typeof d.bedBelt === 'boolean') {
      deviceIsBelt.value = d.bedBelt
      return
    }
  } catch {
    /* fall through to stock */
  }
  const stock = getStockFdmDevice(resolveStockFdmDeviceId(name))
  deviceIsBelt.value = !!stock?.bedBelt
}

async function refreshLists() {
  const [devs, procs, mats] = await Promise.all([listFdmDevices(), listFdmProcesses(), listFdmMaterials()])
  stockDevices.value = devs.stock.map((d) => d.name)
  localDevices.value = devs.local.map((d) => d.name)
  stockProcesses.value = procs.stock.map((p) => p.name)
  localProcesses.value = procs.local.map((p) => p.name)
  const matNames = [...mats.stock.map((m) => m.name), ...mats.local.map((m) => m.name)]
  materials.value = matNames.length ? matNames : ['PLA']
  await refreshDeviceBeltFlag()
}

onMounted(() => {
  void refreshLists()
})

watch(
  () => [props.device, props.process, props.material],
  () => {
    void refreshLists()
  },
)

async function onDeviceChange(ev: Event) {
  const name = (ev.target as HTMLSelectElement).value
  await setCurrentDevice(name)
  emit('changed')
}

async function onProcessChange(ev: Event) {
  const name = (ev.target as HTMLSelectElement).value
  await setCurrentProcess(name)
  emit('changed')
}

async function onMaterialChange(ev: Event) {
  const name = (ev.target as HTMLSelectElement).value
  await setCurrentMaterial(name)
  emit('changed')
}

function scheduleSave(next: FdmProcess) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await saveFdmProcess(next.processName, next)
    emit('changed')
  }, 250)
}

function patch(partial: Partial<FdmProcess>) {
  if (!props.proc) return
  const next = clonePlain({ ...props.proc, ...partial }) as FdmProcess
  emit('update:proc', next)
  scheduleSave(next)
}

function num(key: keyof FdmProcess, ev: Event) {
  const v = Number((ev.target as HTMLInputElement).value)
  if (!Number.isFinite(v)) return
  patch({ [key]: v } as Partial<FdmProcess>)
}

function bool(key: keyof FdmProcess, ev: Event) {
  patch({ [key]: (ev.target as HTMLInputElement).checked } as Partial<FdmProcess>)
}

function str(key: keyof FdmProcess, ev: Event) {
  patch({ [key]: (ev.target as HTMLSelectElement).value } as Partial<FdmProcess>)
}

function thinWallChange(ev: Event) {
  const v = Number((ev.target as HTMLSelectElement).value)
  if (!Number.isFinite(v)) return
  patch({ sliceDetectThin: v })
}
</script>
