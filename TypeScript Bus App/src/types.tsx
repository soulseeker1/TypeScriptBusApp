export interface GeoJSONType {
  app_name: string
  type: string
  features: Feature[]
}

export interface Feature {
  type: string
  geometry: Geometry
  properties: Properties
}

export interface Geometry {
  type: string
  coordinates: number[]
}

export interface Properties {
  "point type": string
}
