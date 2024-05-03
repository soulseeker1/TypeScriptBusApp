export interface GeoJSONType {
  app_name: string
  type: "Feature" | "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon" | "GeometryCollection" | "FeatureCollection"
  features: Feature[]
}

export interface Feature {
  type: string
  geometry: Geometry
  properties: Properties
  id: number | null
}

export interface Geometry {
  type: string
  coordinates: number[]
}

export interface Properties {
  "point type": string
}
