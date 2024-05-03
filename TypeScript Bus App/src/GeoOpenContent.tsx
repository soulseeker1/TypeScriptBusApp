// import React from "react"

interface GeoOpenContentProps {
  selectedOption: string | null
  selectedLineOption: string | null
  selectedFeature: any
  setSelectedFeature: React.Dispatch<React.SetStateAction<any>>
}

const GeoOpenContent: React.FC<GeoOpenContentProps> = ({ selectedOption, selectedLineOption, selectedFeature, setSelectedFeature }) => {
  return (
    <label>
      {selectedFeature && (
        <label>
          <div>
            <h2>Selected Feature: {selectedOption || selectedLineOption}</h2>
            <table style={{ width: "100%", height: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Property</th>
                  <th style={{ width: "50%" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedFeature.properties || selectedFeature.feature.properties).map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ wordWrap: "break-word" }}>{key}</td>
                    <td style={{ wordWrap: "break-word" }}>{value as React.ReactNode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </label>
      )}
    </label>
  )
}

export default GeoOpenContent
