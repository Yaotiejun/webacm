import * as THREE_NS from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as MeshBVHLib from 'three-mesh-bvh'
import * as SVGLoader from 'three/examples/jsm/loaders/SVGLoader.js'

export const THREE = THREE_NS
export default THREE_NS

export {
  BufferGeometryUtils,
  MeshBVHLib,
  SVGLoader,
  Line2,
  LineGeometry,
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
}