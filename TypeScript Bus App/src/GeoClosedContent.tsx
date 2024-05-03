import { ChangeEvent, useState } from "react"
import Select from "react-select"
import Button from "react-bootstrap/Button"
import ButtonGroup from "react-bootstrap/ButtonGroup"
import Axios from "axios"
import Spinner from "react-bootstrap/Spinner"
import { styled } from "@mui/system"
import DeleteIcon from "@mui/icons-material/Delete"
import StraightIcon from "@mui/icons-material/Straight"
import RoundaboutRightIcon from "@mui/icons-material/RoundaboutRight"
import { TrinityRingsSpinner } from "react-epic-spinners"
import { ToastContainer, toast } from "react-toastify"
import { Feature, GeoJSONType } from "./types.tsx"

interface GeoClosedContentProps {
  selectedOption: string | null
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>
  selectedLineOption: string | null
  setSelectedLineOption: React.Dispatch<React.SetStateAction<string | null>>
  //   handleDropdownChange: (event: ChangeEvent<HTMLSelectElement>) => void
  //   handleDropdownLineChange: (event: ChangeEvent<HTMLSelectElement>) => void
  vehOptions: {
    value: string
    label: string
  }[]
  lineOptions: {
    value: string
    label: string
  }[]
  historyLine: Array<string>
  historyVehRef: Array<string>
  clearHistory: (target: string) => void
  GeoToLeaflet: GeoJSONType | null
  setGeoToLeaflet: React.Dispatch<React.SetStateAction<GeoJSONType | null>>
  GeoByCurveRoute: GeoJSONType | null
  setGeoByCurveRoute: React.Dispatch<React.SetStateAction<GeoJSONType | null>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  actualGeoMode: boolean
  setActualGeoMode: React.Dispatch<React.SetStateAction<boolean>>
  geoByStraightRoute: GeoJSONType | null
  setGeoByStraightRoute: React.Dispatch<React.SetStateAction<GeoJSONType | null>>
  newSearch: boolean
  setNewSearch: React.Dispatch<React.SetStateAction<boolean>>
}

const GeoClosedContent: React.FC<GeoClosedContentProps> = ({ selectedOption, setSelectedOption, selectedLineOption, setSelectedLineOption, historyLine, historyVehRef, clearHistory, lineOptions, vehOptions, GeoToLeaflet, setGeoToLeaflet, GeoByCurveRoute, setGeoByCurveRoute, isLoading, setIsLoading, actualGeoMode, setActualGeoMode, geoByStraightRoute, setGeoByStraightRoute, newSearch, setNewSearch }) => {
  const handleDropdownChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value)
  }

  const handleDropdownLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLineOption(event.target.value)
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //This function will check the whether actualGeoMode(to evaluate whether the user wants the straight route or
  //curved route), and whether the current search is a "newsearch". New search meant that the GeoCurveRoute data
  //is outdated and has to be reloaded. There are 3 possible scenarios, starting with user clicking the button
  //1) actualGeoMode is currently curve route(true), we change to straight route from history(geoByStraightRoute) and
  // set ActualGeoMode to false
  //2) actualGeoMode is currently straightroute(false) AND newSearch is true, we need to call the function to gather
  // new curve route data
  //3) actualGeoMode is currently straightroute(false) AND newSearch is false, we just switch the geoToLeafLet data
  // back to curveroute
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const [geoArrayforClean, setGeoArrayForClean] = useState<Array<Feature>>([])
  async function switchActualGeo() {
    if (actualGeoMode == true) {
      setGeoToLeaflet(geoByStraightRoute)
      setActualGeoMode(false)
      toast.success("Displaying straight bus route for :" + selectedOption || selectedLineOption)
    }
    if (actualGeoMode == false && newSearch == true) {
      console.log("setting geoByStraightRoute")
      console.log(GeoToLeaflet)
      setGeoByCurveRoute(null)
      setGeoByStraightRoute(GeoToLeaflet) //Store into a variable first
      console.log(geoByStraightRoute)
      coordinateExtract(GeoToLeaflet)
      setActualGeoMode(true)
      setNewSearch(false)
      console.log("actualGeoMode " + actualGeoMode)
    }
    if (actualGeoMode == false && newSearch == false) {
      setGeoToLeaflet(GeoByCurveRoute)
      setActualGeoMode(true)
      toast.success("Displaying actual bus route for :" + selectedOption || selectedLineOption)
    }
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //This function will allow extract the start and end point of each feature then call function curveLatLongAPI,
  //After curveLatLongAPI, this function will then call cleanGeoByCurveRoute, which will combine all the results from
  //curveLatLongAPI to the appropriate geoJSON form and finally set the geoJSON to GeoToLeaflet, to display on leaflet
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async function coordinateExtract(ChangeGeoJSON: GeoJSONType | null) {
    setIsLoading(true)
    if (ChangeGeoJSON != null) {
      console.log(ChangeGeoJSON)
      console.log(ChangeGeoJSON.features)

      // Array to store all Axios promises
      const axiosPromises: any[] = []

      ChangeGeoJSON.features.forEach((feature) => {
        let coordinates = feature.geometry.coordinates
        console.log(feature.geometry.type)

        if (feature.geometry.type !== "Point") {
          console.log("NOTE THIS IS A POINT!!!!!!!!!!!!")

          for (let i = 0; i < coordinates.length - 1; i++) {
            let startPt = coordinates.slice(i)
            let endPt = coordinates.slice(i + 1)
            //   console.log(startPt)
            //   console.log(endPt)
            console.log("coordinates length " + coordinates.length)
            let coordinateFlag = "remove"
            console.log(coordinates)
            if (i == 0) {
              coordinateFlag = "first"
              console.log("PUSHING FIRST START AND END POINT")
              console.log(startPt)
              console.log(endPt)
            }
            if (i == coordinates.length - 2) {
              coordinateFlag = "last"
              console.log("PUSHING LAST START AND END POINT")
              console.log(startPt)
              console.log(endPt)
            }
            axiosPromises.push(curveLatLongAPI(startPt, endPt, coordinateFlag))
            console.log("i= " + i)
          }

          console.log("onefeature done")
        }
      })

      try {
        // Wait for all Axios promises to resolve
        await Promise.all(axiosPromises)

        // After all Axios calls are completed, clean and set the GeoToLeaflet state
        //cleanGeoByCurveRoute(GeoByCurveRoute)
      } catch (error) {
        console.error("Error occurred:", error)
      }
      await cleanGeoByCurveRoute(geoArrayforClean)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //This function will accept coordinates, startPt and endPt then perform axios call to get the curved geoJSON
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Define a type for an array of points
  type PointsArray = number[]
  async function curveLatLongAPI(startPt: PointsArray, endPt: PointsArray, coordinateFlag: string) {
    console.log("INSIDE CURVELATLONG!!!!!!!!!!!!!!!!!!!!!!!")
    console.log(startPt[0])
    //Creating the request body for the axios to send backend the coordinates
    const requestBody = {
      startPt: {
        long: startPt[0],
        lat: startPt[1],
      },
      endPt: {
        long: endPt[0],
        lat: endPt[1],
      },
    }
    console.log("sending")
    console.log("startPt:", startPt)
    //console.log("endPt:", endPt)
    console.log(requestBody)

    //Const for temporary array to push!!!

    try {
      const response = await Axios.post("https://nyc-bus-routing-k3q4yvzczq-an.a.run.app/route", requestBody, {
        withCredentials: false,
      })
      // Obtain GeoJSON from backend and we will store the responses into variable GeoByCurveRoute
      if (response.status === 200 && response.data != "Wait") {
        console.log(response.data)
        //GeoByCurveRoute.push(response.data)
        console.log("PUSHED")
        console.log(startPt[0])
        console.log(startPt[1])
        console.log(endPt[0])
        console.log(endPt[1])
        console.log("response.data: ")
        console.log(response.data)
        console.log(response.data.features)

        const filteredFeatures: Feature = response.data.features.filter((feature: Feature) => {
          if (coordinateFlag == "first") {
            console.log("FIRST FEATURE START")
            if (feature.properties) return feature.properties["point type"] !== "start" && feature.properties["point type"] !== "goal" && feature.properties["point type"] !== "closest goal"
          }
          if (coordinateFlag == "last") {
            console.log("FIRST FEATURE GOAL")
            if (feature.properties) return feature.properties["point type"] !== "start" && feature.properties["point type"] !== "goal" && feature.properties["point type"] !== "closest start"
          }
          if (coordinateFlag == "remove") {
            if (feature.properties) return feature.properties["point type"] !== "closest start" && feature.properties["point type"] !== "closest goal" && feature.properties["point type"] !== "start" && feature.properties["point type"] !== "goal"
          }
        })
        //original
        //if (feature.properties) return feature.properties["point type"] !== "closest start" && feature.properties["point type"] !== "closest goal"
        console.log(filteredFeatures)
        geoArrayforClean.push(filteredFeatures)
      }
      //   if (response.status === 200 && response.data === "Wait") {
      //     //retry!!!!
      //     // Retry if response data is "Wait"
      //     // if (retryCount < 30) {
      //     //   // Set MAX_RETRY to your desired maximum retry count
      //     //   const delay = 5000 // Set your desired delay in milliseconds
      //     //   console.log(`Retrying after ${delay / 1000} seconds...`)
      //     //   setTimeout(() => {
      //     //     curveLatLongAPI(startPt, endPt, retryCount + 1)
      //     //   }, delay)
      //     //   setIsLoading(false)
      //     // } else {
      //     //   console.log("Maximum retry count exceeded.")
      //     //   setIsLoading(false)
      //     // }
      //   }
    } catch (error) {
      if (Axios.isAxiosError(error)) {
        console.log("There was a problem with curveLatLongAPI")
        console.log(error)
        setIsLoading(false)
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //This function will collect geoJSON from curvedLatLongAPI, concate and map them to allow visualization on leaflet
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  async function cleanGeoByCurveRoute(uncleanedGeoJSON: Array<Feature>) {
    console.log("INSIDE CLEANING !!!!!!!!!!!!!!!!!!!")
    // Initialize an empty array to store all features
    let allFeatures: Array<Feature> = []
    console.log("uncleanedGeoJSON ", uncleanedGeoJSON)
    ///////CHECK FOR IF ARRAY IS EMPTY if empty, we retry
    if (uncleanedGeoJSON.length == 0) {
      console.log("uncleaned GeoJSON is empty! retry!")
      toast.error("Backend is not ready, retrying")
      coordinateExtract(GeoToLeaflet)
    } else {
      // Loop through each GeoJSON object in GeoByCurveRoute array
      uncleanedGeoJSON.forEach((geoJSON) => {
        //const features = geoJSON.features
        // Combine the features to the allFeatures array
        allFeatures = allFeatures.concat(geoJSON)
        console.log(geoJSON)
      })

      // Create a new GeoJSON object with the combined features
      const mergedGeoJSON: GeoJSONType = {
        app_name: "Geo Bus",
        type: "FeatureCollection",
        features: allFeatures,
      }

      // Initialize an ID counter
      let idCounter = 0

      console.log(mergedGeoJSON)

      // Iterate over each feature in the features array
      mergedGeoJSON.features.forEach((feature) => {
        // Assign a unique ID to each feature
        feature.id = idCounter++
      })
      console.log("mergedGeo JSON: " + mergedGeoJSON)
      setGeoToLeaflet(mergedGeoJSON)
      setGeoByCurveRoute(mergedGeoJSON)
      console.log(mergedGeoJSON)
      setIsLoading(false)
      //   if (mergedGeoJSON.length == 0) {
      //     toast.error("Something went wrong with the curved route fetching, please try again")
      //   } else {
      //     toast.success("Displaying actual bus route for :" + selectedOption || selectedLineOption)
      //   }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //This function will filter through
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }
  return (
    <div className={isLoading ? "sideBarStyle" : "loadingStyle"}>
      {isLoading === false ? (
        <div>
          <label>
            <h5>Select a Vehicle Reference:</h5>
            <Select value={vehOptions.find((opt) => opt.value === selectedOption)} onChange={handleDropdownChange} options={vehOptions} placeholder="Select or type..." />
            {selectedOption != null && actualGeoMode === true && <StraightIcon style={{ backgroundColor: "#00e5ff", border: 1 }} onClick={() => switchActualGeo()} />}
            {selectedOption != null && actualGeoMode === false && <RoundaboutRightIcon style={{ backgroundColor: "#00e5ff", border: 1 }} onClick={() => switchActualGeo()} />}
            {historyVehRef.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Past Searches:
                  {historyVehRef.length > 0 && (
                    // <button class="history-button" onClick={() => clearHistory("historyVehRef")}>
                    //   <DeleteIcon style={{ backgroundColor: "green" }} />
                    // </button>
                    <DeleteIcon style={{ backgroundColor: "transparent" }} onClick={() => clearHistory("historyVehRef")} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {historyVehRef.map((item, index) => (
                    <button id="history-button" key={index} onClick={() => setSelectedOption(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </label>
          <label>
            <div>
              <h5>Select a Published Line: </h5>
              <Select value={lineOptions.find((opt) => opt.value === selectedLineOption)} onChange={handleDropdownLineChange} options={lineOptions} placeholder="Select or type..." />
              {selectedLineOption != null && actualGeoMode === true && <StraightIcon style={{ backgroundColor: "#00e5ff", border: 1 }} onClick={() => switchActualGeo()} />}
              {selectedLineOption != null && actualGeoMode === false && <RoundaboutRightIcon style={{ backgroundColor: "#00e5ff", border: 1 }} onClick={() => switchActualGeo()} />}
              {historyLine.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Past Searches:
                    <DeleteIcon style={{ backgroundColor: "transparent" }} onClick={() => clearHistory("historyLine")} />
                    <div />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {historyLine.map((item, index) => (
                      <button id="history-button" key={index} onClick={() => setSelectedLineOption(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      ) : (
        <div className="loader" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <TrinityRingsSpinner color="blue"></TrinityRingsSpinner>
        </div>
      )}
    </div>
  )
}

export default GeoClosedContent
